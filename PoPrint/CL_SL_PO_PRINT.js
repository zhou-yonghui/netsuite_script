/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/file', './handlebars', 'N/render', 'N/record'], function (search, file, Handlebars, render, record) {

    function onRequest(context) {
        try {
            var response = context.response;
            var request = context.request;
            var params = request.parameters; //参数
            var po_id = params.bill_id;
            var bill_type = params.bill_type;
            //打印
            PrintResult(po_id, response, bill_type);
        } catch (e) {
            log.debug('e', e);
        }
    }

    function PrintResult(po_id, response, bill_type) {
        var POPdf = setValueIncludeTax(po_id, bill_type);
        response.writeFile({
            file: POPdf,
            isInline: true
        });
    }

    function setValueIncludeTax(po_id, bill_type) {
        var printData = new Object(), item_arr = [], line_no = 0, chinese_full_name, chinese_address, english_full_name, english_address, po_num, trandate,
            total_qty = 0, total_amt = 0, contact_person, employee, gys_terms, currency, chinese_demander_name, english_demander_name, chinese_demander_address,
            english_demander_address, sub_id;
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'internalId', operator: 'is', values: po_id },
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false },
                { name: 'shipping', operator: 'is', values: false },
            ],
            columns: [
                { name: 'custentity_hl_bsq_chinese_full_name', join: 'vendor' },//0
                { name: 'custentity_chinese_address', join: 'vendor' },//1
                { name: 'custentity_hl_bsq_english_full_name', join: 'vendor' },//2
                { name: 'custentity_english_address', join: 'vendor' },//3
                { name: 'tranid' },//4
                { name: 'quantity' },//5
                { name: 'item' },//6
                { name: 'unit' },//7
                { name: 'fxrate' },//8
                { name: 'currency' },//9
                { name: 'expectedreceiptdate' },//10
                { name: 'custcol_delivery_date' },//11
                { name: 'custcol_sl_remark' },//12
                { name: 'custentity_contact_person', join: 'vendor' },//13
                { name: 'trandate' },//14
                { name: 'custentity_gys_terms', join: 'vendor' },//15
                { name: 'rate', join: 'taxItem' },//16
                { name: 'displayname', join: 'item' },//17
                { name: 'custcol_sl_old_sku' },//18
                { name: 'subsidiarynohierarchy' }//19
            ]
        }).run().each(function (rec) {
            sub_id = rec.getValue(rec.columns[19]);
            chinese_demander_name = rec.getText(rec.columns[19]);
            chinese_full_name = rec.getValue(rec.columns[0]);
            chinese_address = rec.getValue(rec.columns[1]);
            english_full_name = rec.getValue(rec.columns[2]);
            english_address = rec.getValue(rec.columns[3]);
            po_num = rec.getValue(rec.columns[4]);
            trandate = rec.getValue(rec.columns[14]);
            total_qty = Number(total_qty) + Number(rec.getValue(rec.columns[5]));
            contact_person = rec.getValue(rec.columns[13]);
            gys_terms = (rec.getValue(rec.columns[15])).split('|');
            var tax_rate = (rec.getValue(rec.columns[16])).replace('%', '');
            var unit_price = (Number(rec.getValue(rec.columns[8])) * (1 + Number(tax_rate) / 100)).toFixed(4);
            total_amt = Number(total_amt) + (Number(rec.getValue(rec.columns[5])) * unit_price);
            currency = rec.getText(rec.columns[9]);
            line_no = Number(line_no) + 1;
            item_arr.push({
                line_no: line_no,
                sku: rec.getText(rec.columns[6]),
                sku_old: rec.getValue(rec.columns[18]),
                sku_name: rec.getValue(rec.columns[17]),
                qty: rec.getValue(rec.columns[5]),
                unit: rec.getValue(rec.columns[7]),
                unit_price: unit_price,
                delivery_date: rec.getValue(rec.columns[11]),
                cargo_ready_date: rec.getValue(rec.columns[10]),
                amount: (Number(rec.getValue(rec.columns[5])) * unit_price).toFixed(2),
                remark: rec.getValue(rec.columns[12])
            })
            return true;
        });
        //获取采购订单员工
        var po_data = record.load({ type: 'purchaseorder', id: po_id });
        employee = po_data.getText('employee');
        //获取子公司的英文名称、中文地址、英文地址
        var sub_data = search.lookupFields({ type: 'subsidiary', id: sub_id, columns: ['custrecord_eng_cmp_name', 'custrecord_cn_adress', 'custrecord_eng_adress'] });
        english_demander_name = sub_data.custrecord_eng_cmp_name;
        chinese_demander_address = sub_data.custrecord_cn_adress;
        english_demander_address = sub_data.custrecord_eng_adress;
        printData['chinese_demander_name'] = chinese_demander_name;
        printData['english_demander_name'] = english_demander_name;
        printData['chinese_demander_address'] = chinese_demander_address;
        printData['english_demander_address'] = english_demander_address;
        printData['chinese_full_name'] = chinese_full_name;
        printData['chinese_address'] = chinese_address;
        printData['english_full_name'] = english_full_name;
        printData['english_address'] = english_address;
        printData['po_num'] = po_num;
        printData['trandate'] = trandate;
        printData['total_qty'] = total_qty;
        printData['total_amt'] = total_amt.toFixed(2);
        printData['contact_person'] = contact_person;
        printData['employee'] = employee;
        printData['gys_terms'] = gys_terms;
        log.debug('item_arr', item_arr);
        printData['item_arr'] = item_arr;
        log.debug('printData', printData);
        // 获取模板内容,写全路径或者内部ID
        var model;
        if (bill_type == 1) {
            if (currency == 'USD') {
                model = file.load({
                    id: 'SuiteScripts/PoPrint/po_print_en.xml'
                }).getContents();
            } else {
                model = file.load({
                    id: 'SuiteScripts/PoPrint/po_print_cn.xml'
                }).getContents();
            }
        } else {
            model = file.load({
                id: 'SuiteScripts/PoPrint/po_ord_print.xml'
            }).getContents();
        }
        //订货合同部分内容
        var party_a, party_b, currency_text;
        if (currency == 'USD') {
            party_a = chinese_demander_name + ' ' + english_demander_name;
            party_b = chinese_full_name + ' ' + english_full_name;
            currency_text = '美元';
        } else {
            currency_text = '人民币';
            party_a = chinese_demander_name;
            party_b = chinese_full_name;
        }
        printData['party_a'] = party_a;
        printData['party_b'] = party_b;
        printData['currency_text'] = currency_text;
        var total_amt_cn = convertCurrency(total_amt.toFixed(2));
        printData['amt_cn'] = currency_text + total_amt_cn;
        // 处理数据
        var template = Handlebars.compile(model);
        var xml = template(printData);

        var myFile = render.create();
        myFile.templateContent = xml;
        var POPdf = myFile.renderAsPdf();
        return POPdf;
    }

    function convertCurrency(money) {
        //汉字的数字
        var cnNums = new Array('零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖');
        //基本单位
        var cnIntRadice = new Array('', '拾', '佰', '仟');
        //对应整数部分扩展单位
        var cnIntUnits = new Array('', '万', '亿', '兆');
        //对应小数部分单位
        var cnDecUnits = new Array('角', '分', '毫', '厘');
        //整数金额时后面跟的字符
        var cnInteger = '整';
        //整型完以后的单位
        var cnIntLast = '元';
        //最大处理的数字
        var maxNum = 999999999999999.9999;
        //金额整数部分
        var integerNum;
        //金额小数部分
        var decimalNum;
        //输出的中文金额字符串
        var chineseStr = '';
        //分离金额后用的数组，预定义
        var parts;
        if (money == '') { return ''; }
        money = parseFloat(money);
        if (money >= maxNum) {
            //超出最大处理数字
            return '';
        }
        if (money == 0) {
            chineseStr = cnNums[0] + cnIntLast + cnInteger;
            return chineseStr;
        }
        //转换为字符串
        money = money.toString();
        if (money.indexOf('.') == -1) {
            integerNum = money;
            decimalNum = '';
        } else {
            parts = money.split('.');
            integerNum = parts[0];
            decimalNum = parts[1].substr(0, 4);
        }
        //获取整型部分转换
        if (parseInt(integerNum, 10) > 0) {
            var zeroCount = 0;
            var IntLen = integerNum.length;
            for (var i = 0; i < IntLen; i++) {
                var n = integerNum.substr(i, 1);
                var p = IntLen - i - 1;
                var q = p / 4;
                var m = p % 4;
                if (n == '0') {
                    zeroCount++;
                } else {
                    if (zeroCount > 0) {
                        chineseStr += cnNums[0];
                    }
                    //归零
                    zeroCount = 0;
                    chineseStr += cnNums[parseInt(n)] + cnIntRadice[m];
                }
                if (m == 0 && zeroCount < 4) {
                    chineseStr += cnIntUnits[q];
                }
            }
            chineseStr += cnIntLast;
        }
        //小数部分
        if (decimalNum != '') {
            var decLen = decimalNum.length;
            for (var i = 0; i < decLen; i++) {
                var n = decimalNum.substr(i, 1);
                if (n != '0') {
                    chineseStr += cnNums[Number(n)] + cnDecUnits[i];
                }
            }
        }
        if (chineseStr == '') {
            chineseStr += cnNums[0] + cnIntLast + cnInteger;
        } else if (decimalNum == '') {
            chineseStr += cnInteger;
        }
        return chineseStr;
    }

    return {
        onRequest: onRequest
    }
});
