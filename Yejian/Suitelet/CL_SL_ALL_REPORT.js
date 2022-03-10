/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @author zhouyh
 * @description This's a sample SuiteLet script(SuiteScript 2.0) to export data
 *              to Excel file and directly download it in browser
 */
 define(
    [ 'N/file', 'N/encode' ,'N/record', 'N/file', 'SuiteScripts/handlebars.min', 'N/render','N/search'],
    /**
     * @param {file}
     *            file
     * @param {format}
     *            format
     * @param {record}
     *            record
     * @param {redirect}
     *            redirect
     * @param {runtime}
     *            runtime
     * @param {search}
     *            search
     * @param {serverWidget}
     *            serverWidget
     */
    function(file, encode, record, file ,Handlebars, render,search) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object}
         *            context
         * @param {ServerRequest}
         *            context.request - Encapsulation of the incoming
         *            request
         * @param {ServerResponse}
         *            context.response - Encapsulation of the Suitelet
         *            response
         * @Since 2015.2
         */
        function onRequest(context) {
            log.debug('request.method',context.request.method);//TODO:调用sl脚本时method是POST
            try{
                var xml_data = new Object(); 
                if (context.request.method == 'POST') {
                    var para = context.request.parameters;
                    log.debug('para recid rectype',JSON.stringify(para) + '---' + para.recordId + '---' + para.recordType);
                    var rec_type = para.recordType;
                    var recid = para.recordId;
                    var file_type;
                    var xml_id;
                    if(rec_type == 'customrecord_sl_qu'){
                        //获取模板打印取值单的信息
                        var rec_ci = record.load({
                            type: 'customrecord_sl_qu',
                            id: recid,
                            isDynamic: true,
                        });
                        var company_logo = rec_ci.getValue('custrecord_sl_qu_logoselect');
                        log.debug('company_logo',company_logo);
                        var company_name = rec_ci.getValue('custrecord_sl_qu_comname');
                        var dianziz = rec_ci.getValue('custrecord_sl_dianziz');//电子章
                        var type = rec_ci.getText('custrecord_sl_qu_type');//
                        log.debug('模板类型',type);
                        if(type == 'PI'){
                            file_type = 'PI_';       //傲英PI.xml
                            xml_id = 65;
                        }else if(type == 'PL'){
                            file_type = 'PL_';       //PL_Yejian.xml
                            xml_id = 133;
                        }else if(type == 'CI'){
                            file_type = 'CI_';        //傲英CI.xml
                            xml_id = 82;
                        }else{
                            xml_id = 'noid';
                        }
                        //获取数据
                        if(xml_id != 'noid'){
                            var cur_t = rec_ci.getText('custrecord_sl_print_currency');
                            // xml_data.currencyDis = cur_t + rec_ci.getValue('custrecord_sl_dybzq');
                            xml_data.currencyDis = rec_ci.getValue('custrecord_sl_dybzq');
                            xml_data.companyLogo = getFileUrl(company_logo);
                            xml_data.dianziz = getFileUrl(dianziz);
                            xml_data.salesContact = rec_ci.getValue('custrecord_sl_qu_supplier');//SUPPLIER
                            // xml_data.companyName = company_name;
                            //公司信息
                            var company_info_data = rec_ci.getValue('custrecord_sl_qu_companyinfo').split('\n');
                            xml_data.companyName = company_info_data[0];
                            var companyArr = new Array();
                            for(var m = 1;m < company_info_data.length;m++){
                                var com_obj = new Object();
                                com_obj.companyInfo = company_info_data[m];
                                companyArr.push(com_obj);
                            }
                            xml_data.companyInfoArr = companyArr;
                            if(company_info_data.length < 5){
                                xml_data.companyTopRowspanNum = 5;
                            }else {
                                xml_data.companyTopRowspanNum = company_info_data.length;
                            }
                            xml_data.company1InfoAddr1 = company_info_data[1];
                            xml_data.company1InfoAddr2 = company_info_data[2];
                            xml_data.company1InfoTel = company_info_data[3];
                            //供应商信息
                            var supplier_data = rec_ci.getValue('custrecord_sl_qu_supplier').split('\n');//
                            var supplierArr = new Array();
                            for(var s = 0;s < supplier_data.length;s++){
                                var supplier_obj = new Object();
                                supplier_obj.supplierInfo = supplier_data[s];
                                supplierArr.push(supplier_obj);
                            }
                            xml_data.supplierInfoArr = supplierArr;
                            xml_data.companyInfoFir = supplier_data[0];
                            xml_data.companyInfoSec = supplier_data[1];
                            xml_data.companyInfoZip = supplier_data[2];
                            xml_data.companyInfoTel = supplier_data[3];
                            xml_data.companyInfoEmail = supplier_data[4];
                            //客户信息
                            var customerInfo_data = rec_ci.getValue('custrecord_sl_qu_customerinfo').split('\n');
                            var customerArr = new Array();
                            for(var t = 0;t < customerInfo_data.length;t++){
                                var customer_obj = new Object();
                                customer_obj.customerInfo = customerInfo_data[t];
                                customerArr.push(customer_obj);
                            }
                            xml_data.customerInfoArr = customerArr;
                            xml_data.customerInfoCountry = customerInfo_data[0];
                            xml_data.customerInfoName = customerInfo_data[1];
                            xml_data.customerInfoCompany = customerInfo_data[2];
                            xml_data.customerInfoAddr = customerInfo_data[3];
                            xml_data.customerInfoAddr2 = customerInfo_data[4];
                            xml_data.customerInfoCity = customerInfo_data[5];
                            xml_data.customerInfoRegion = customerInfo_data[6];
                            xml_data.customerInfoPostCode = customerInfo_data[7];
                            //
                            xml_data.signature = rec_ci.getValue('custrecord_sl_ename');//SIGNATURE
                            xml_data.date = rec_ci.getText('custrecord_sl_qu_date');
                            xml_data.piNo = rec_ci.getValue('custrecord_sl_qu_pino');//PI No
                            xml_data.poNo = rec_ci.getValue('custrecord_sl_number');// PO Number
                            var remark_data = rec_ci.getValue('custrecord_sl_remark').split('\n');//REMARK
                            xml_data.remark1 = remark_data[0];
                            xml_data.remark2 = remark_data[1];
                            xml_data.remark3 = remark_data[2];
                            xml_data.remark4 = remark_data[3];
                            xml_data.remark5 = remark_data[4];
                            xml_data.remark6 = remark_data[5];
                            xml_data.remark7 = remark_data[6];
                            var remark_arr = new Array();
                            remark_arr.push('       ');//加一行空格
                            for(var r = 0;r < remark_data.length;r++){
                                var remark_obj = new Object();
                                remark_obj.remarkInfo = remark_data[r];
                                remark_arr.push(remark_obj);
                            }
                            log.debug('remark_arr',remark_arr);
                            xml_data.markInfo = remark_arr;

                            xml_data.incoterms = rec_ci.getValue('custrecord_sl_incoterms');//
                            xml_data.salesEmail = rec_ci.getValue('custrecord_sl_qu_salesemail');
                            var rec_data = getRecData(rec_ci.getValue('custrecord_sl_so_no'),rec_ci.getText('custrecord_sl_so_no'));//TODO：销售订单或者报价单数据
                            log.debug('rec_data',rec_data);
                            // if(rec_data.bank_info){
                                var bank_arr = new Array();
                                // var bank_info = rec_data.bank_info.split('\n');
                                var bank_info = rec_ci.getValue('custrecord_sl_mbyhxxmx').split('\n');
                                for(var b = 0;b < bank_info.length;b++){
                                    var bank_obj = new Object();
                                    bank_obj.bankInfo = bank_info[b];
                                    bank_arr.push(bank_obj);
                                }
                                log.debug('bank_arr',bank_arr);
                                xml_data.bankInfo = bank_arr;
                            // }
                            var tk_arr = new Array();
                            // if(rec_data.tk_info) {
                                // var tk_info = rec_data.tk_info.split('\n');
                                var tk_info = rec_ci.getValue('custrecord_sl_mbtkxxmx').split('\n');
                                for(var t = 0;t < tk_info.length;t++){
                                    var tk_obj = new Object();
                                    tk_obj.note = tk_info[t];
                                    tk_arr.push(tk_obj);
                                }
                                log.debug('tk_arr',tk_arr);
                                xml_data.tkArr = tk_arr;
                            // }
                            //pi信息
                            var pi_info = new Array();
                            pi_info.push(xml_data.poNo);
                            pi_info.push(xml_data.date);
                            pi_info.push(xml_data.incoterms);
                            pi_info.push(xml_data.signature);
                            var pi_top_info = new Array();
                            pi_top_info.push('PO Number: ');
                            pi_top_info.push('Date: ');
                            pi_top_info.push('Incoterms: ');
                            pi_top_info.push('Sales Rep. : ');
                            var piRight_arr = new Array();
                            for(var p = 0;p < pi_info.length;p++){
                                var pi_obj = new Object();
                                pi_obj.rightTopInfo = pi_top_info[p];
                                pi_obj.rightInfo = pi_info[p];
                                piRight_arr.push(pi_obj);
                            }
                            log.debug('piRight_arr',piRight_arr);
                            xml_data.piRight_arr = piRight_arr;

                            //产品明细数据
                            var qu_items = getDetails(rec_ci,rec_type,xml_data);
                            // log.debug('qu_items',qu_items);
                            if(qu_items.items.length > 0){
                                xml_data.subSum = qu_items.items[qu_items.items.length - 1].sum;
                                // if(qu_items.items[qu_items.items.length - 1].package_sum){
                                if(qu_items.package_num){
                                    // xml_data.packageSum = getNumberEnglish(qu_items.items[qu_items.items.length - 1].package_sum) + '(' + qu_items.items[qu_items.items.length - 1].package_sum + ')';
                                    xml_data.packageSum = getNumberEnglish(qu_items.package_num) + "(" + qu_items.package_num + ")";
                                }else {
                                    xml_data.packageSum = 'Zero' + "(0)";
                                }
                                xml_data.qtySum = qu_items.items[qu_items.items.length - 1].qty_sum;
                                xml_data.weightSum = (qu_items.items[qu_items.items.length - 1].weight_sum).toFixed(2);
                            }
                            xml_data.items = qu_items.items;
                            //费用货品明细数据
                            var fy_items = getFyDetails(rec_ci,rec_type,xml_data.currencyDis);
                            xml_data.fyItems = fy_items;
                            if(qu_items.items.length > 0 && fy_items.length > 0){
                                xml_data.sum = Number(qu_items.items[qu_items.items.length - 1].sum) + Number(fy_items[fy_items.length - 1].sum);
                            }
                            else if(qu_items.items.length > 0){
                                xml_data.sum = Number(qu_items.items[qu_items.items.length - 1].sum);
                            }
                            else if(fy_items.length > 0){
                                xml_data.sum = Number(fy_items[fy_items.length - 1].sum);
                            }
                            //空数组
                            if(fy_items.length == 0){
                                xml_data.emptyArr = new Array(1,2,3,4,5);
                            }else if(fy_items.length == 1){
                                xml_data.emptyArr = new Array(1,2,3,4);
                            }else if(fy_items.length == 2){
                                xml_data.emptyArr = new Array(1,2,3);
                            }else if(fy_items.length == 3){
                                xml_data.emptyArr = new Array(1,2);
                            }else if(fy_items.length == 4){
                                xml_data.emptyArr = new Array(1);
                            }else if(fy_items.length == 5){
                                xml_data.emptyArr = new Array();
                            }

                        }
                    }
                    else if(rec_type == 'customrecord_sl_baojo'){
                        //获取报价单取值单信息
                        var rec_baojia = record.load({
                            type:'customrecord_sl_baojo',
                            id:recid,
                            isDynamic:true,
                        });
                        file_type = 'BJ_';
                        xml_id = 148;   //BJ_Yejian.xml,傲英报价单
                        var cur_t = rec_baojia.getText('custrecord_sl_quo_currency');
                        xml_data.currencyDis = rec_baojia.getValue('custrecord_sl_dybzaa');
                        xml_data.number = rec_baojia.getValue('custrecord_sl_quo_or');//编号
                        xml_data.companyInfo = rec_baojia.getValue('custrecord_sl_gsxx');//公司信息
                        xml_data.date = rec_baojia.getText('custrecord_sl_quo_baojyx');//报价时间
                        // xml_data.remark = rec_baojia.getValue('custrecord_sl_quo_yymemo');//业务员备注
                        var remark_data = rec_baojia.getValue('custrecord_sl_quo_yymemo').split('\n');//业务员备注
                        var remark_arr = new Array();
                        if(remark_data) {
                            for(var r = 0;r < remark_data.length;r++){
                                var remark_obj =  new Object();
                                remark_obj.remark = remark_data[r];
                                remark_arr.push(remark_obj);
                            }
                            xml_data.remark = remark_arr;
                        }
                        var customerInfo = rec_baojia.getValue('custrecord_sl_quo_cust').split('\n');//客户信息
                        xml_data.customerInfoCountry = customerInfo[0];
                        xml_data.customerInfoName = customerInfo[1];
                        xml_data.customerInfoCompany = customerInfo[2];
                        xml_data.customerInfoAddr = customerInfo[3];
                        xml_data.customerInfoAddr2 = customerInfo[4];
                        xml_data.customerInfoCity = customerInfo[5];
                        xml_data.customerInfoRegion = customerInfo[6];
                        xml_data.customerInfoPostCode = customerInfo[7];
                        // var company_data = getSaleRepInfo();//公司信息
                        var company_data = rec_baojia.getValue('custrecord_sl_gsxx').split('\n');
                        // xml_data.name = company_data[];
                        xml_data.company = company_data[0];
                        xml_data.phone = company_data[7];
                        xml_data.email = company_data[8];
                        xml_data.zip = company_data[6];
                        xml_data.addr = company_data[1];
                        xml_data.addr2 = company_data[2];
                        xml_data.addr3 = company_data[3];
                        xml_data.city = company_data[4];
                        xml_data.cityCode = company_data[5];
                        // var tk_data = getTiaokuan(rec_baojia.getValue('custrecord_sl_quo_sale'),xml_data);//条款
                        var tk_data = rec_baojia.getValue('custrecord_sl_tkxlll');//条款
                        var tk_arr_1 = new Array();
                        if(tk_data) {
                            var tk_info_1 = tk_data.split('\n');
                            for(var n = 0;n < tk_info_1.length;n++){
                                var tk_obj_1 = new Object();
                                tk_obj_1.note = tk_info_1[n];
                                tk_arr_1.push(tk_obj_1);
                            }
                            // log.debug('tk_arr_1',tk_arr_1);
                            xml_data.tkArr = tk_arr_1;
                        }
                        //明细行数据
                        var items = getDetails(rec_baojia,rec_type,xml_data);
                        xml_data.items = items.items;
                        //费用货品数据
                        var fy_items = getFyDetails(rec_baojia,rec_type,xml_data.currencyDis);
                        xml_data.fyItems = fy_items;
                        if(items.items.length > 0 && fy_items.length > 0){
                            xml_data.sum = Number(items.items[items.items.length - 1].sum) + Number(fy_items[fy_items.length - 1].sum);
                            xml_data.subSum = Number(items.items[items.items.length - 1].sum);
                        }
                        else if(items.items.length > 0){
                            xml_data.sum = Number(items.items[items.items.length - 1].sum);
                            xml_data.subSum = Number(items.items[items.items.length - 1].sum);
                        }
                        else if(fy_items.length > 0){
                            xml_data.sum = Number(fy_items[fy_items.length - 1].sum);
                        }
                    }
                    else if(rec_type == 'itemfulfillment' || rec_type == 'salesorder'){
                        var if_items = new Array();
                        var so_id;
                        var so_data;
                        if(rec_type == 'itemfulfillment'){
                            //货品履行单信息
                            var rec_if = record.load({
                                type:rec_type,
                                id:recid,
                                isDynamic:true,
                            });
                            so_id = rec_if.getValue('createdfrom');
                            file_type = 'if_';
                            xml_id = 545;   //出货单.xml
                            //获取明细数据
                            var if_count = rec_if.getLineCount('item');
                            for(var f = 0; f < if_count;f++){
                                rec_if.selectLine('item',f);
                                var cpxh = rec_if.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'itemname',
                                });
                                var qty = rec_if.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'quantity',
                                });
                                var if_item = rec_if.getCurrentSublistValue({
                                    sublistId:'item',
                                    fieldId:'item',
                                });
                                var if_flag = checkItemType(if_item);
                                if(if_flag == 'item'){
                                    if_items.push({
                                        "item" : cpxh,
                                        "qty" : qty,
                                        "str" : cpxh + '，' + '数量' + '：' + qty,
                                    });
                                }
                            }
                        }
                        else if(rec_type == 'salesorder'){
                            file_type = 'so_';
                            xml_id = 545;   //出货单.xml
                        }
                        //获取销售订单信息
                        if(rec_type == 'itemfulfillment'){
                            so_data = getSoData(so_id);
                        }
                        else if(rec_type == 'salesorder'){
                            so_data = getSoData(recid);
                        }
                        log.debug('so_data',so_data);

                        xml_data.soNo = so_data.soNo;
                        xml_data.country = so_data.country;
                        xml_data.shipType = so_data.shipType;
                        xml_data.bxType = so_data.bxType;
                        xml_data.khInfo = so_data.khInfo;
                        var ps_data = so_data.ps.split('\n');
                        var ps_arr = new Array();
                        for(var p = 0;p < ps_data.length;p++){
                            var ps_obj = new Object();
                            ps_obj.ps = ps_data[p];
                            ps_arr.push(ps_obj);
                        }
                        xml_data.psArr = ps_arr;

                        var chyq_data = so_data.chyq.split('\n');
                        var chyq_arr = new Array();
                        for(var c = 0;c < chyq_data.length;c++){
                            var ch_obj = new Object();
                            ch_obj.chyq = chyq_data[c];
                            chyq_arr.push(ch_obj);
                        }
                        xml_data.chyqArr = chyq_arr;

                        xml_data.soYd = so_data.soYd;
                        if(if_items.length > 0){
                            xml_data.items = if_items;
                        }
                        else {
                            xml_data.items = so_data.items;
                        }
                    }
                    else if(rec_type == 'vendorbill'){

                    }
                    else if(rec_type == 'purchaseorder'){
                        file_type = 'PO_';
                        if(para.poFlag == 1){
                            xml_id = 2784;   //PO_Yejian.xml
                        }
                        else if(para.poFlag == 2){
                            xml_id = 3183;   //PO_E_Yejian.xml
                        }

                        var po_data  = getPoData(recid);
                        log.debug('poData',po_data);
                        xml_data.orderNo = po_data.orderNo;
                        xml_data.orderDate = po_data.orderDate;
                        if(po_data.employeeEnglish) { xml_data.employee = po_data.employeeEnglish;}
                        else { xml_data.employee = po_data.employee;}
                        xml_data.employeePhone = po_data.employeePhone;
                        xml_data.vendorCompany = po_data.vendorCompany;
                        // xml_data.vendorAddr = po_data.vendorAddr;
                        var vbAddrData = po_data.vendorAddr.split('\n');
                        var vbAddrArr = new Array();
                        for(var v = 0;v < vbAddrData.length;v++){
                            var vbAddrObj = new Object();
                            vbAddrObj.vbAddr = vbAddrData[v];
                            vbAddrArr.push(vbAddrObj);
                        }
                        xml_data.vbAddrArr = vbAddrArr;
                        xml_data.vendorPhone = po_data.vendorPhone;
                        xml_data.vendorEmail = po_data.vendorEmail;
                        xml_data.vendorEmpolyee = po_data.vendorEmpolyee;
                        xml_data.vendorPayType = po_data.vendorPayType;
                        xml_data.locationEmpolyee = po_data.locationEmpolyee;
                        // xml_data.locationAddr = po_data.locationAddr;
                        var locAddrData = po_data.locationAddr.split('\n');
                        var locAddrArr = new Array();
                        for(var l = 0;l < locAddrData.length;l++){
                            var locAddrObj = new Object();
                            locAddrObj.locAddr = locAddrData[l];
                            locAddrArr.push(locAddrObj);
                        }
                        xml_data.locAddrArr = locAddrArr;
                        xml_data.locationCompany = po_data.locationCompany;
                        xml_data.locationEmail = po_data.locationEmail;
                        xml_data.locationPhone = po_data.locationPhone;
                        var shipData = po_data.shipTk.split('\n');
                        var shipArr = new Array();
                        for(var s = 0;s < shipData.length;s++){
                            var shipObj = new Object();
                            shipObj.shipTk = shipData[s];
                            shipArr.push(shipObj);
                        }
                        xml_data.shipArr = shipArr;
                        var sum = po_data.items[po_data.items.length - 1].sum;
                        xml_data.sum = sum;
                        xml_data.bigSum = numberParseChina(sum);//TODO:阿拉伯数字转中文大写
                        xml_data.bigEnglishSum = getNumberEnglish(sum);//TODO：数字转英文
                        xml_data.items = po_data.items;
                    }
                    else{
                        xml_id = 'noid';
                    }
                    if(xml_id != 'noid'){
                        //加载xml文件
                        var excelModel = file.load({
                            id:xml_id,
                        });
                        //文件名的时间
                        var beijingDate = new Date(new Date().getTime()+(parseInt(new Date().getTimezoneOffset()/60) + 8)*3600*1000);//TODO:获取当前北京时间
                        var month = Number(beijingDate.getMonth()) + Number(1);
                        // log.debug('month',month);
                        var file_name = beijingDate.getFullYear()+ '_' + month + '_' + beijingDate.getDate() + '_' + beijingDate.getTime();
                        
                        //输出excel
                        // var template = Handlebars.compile(excelModel.getContents());
                        // var xlsXML = template();//TODO:template()能传入一个参数，此参数传入xml
                        // var strXmlEncoded = encode.convert({
                        //     string : xlsXML,
                        //     inputEncoding : encode.Encoding.UTF_8,
                        //     outputEncoding : encode.Encoding.BASE_64
                        // });
                        // var objXlsFile = file.create({
                        //     name : file_type + file_name + '.xls',   
                        //     fileType : file.Type.EXCEL,
                        //     contents : strXmlEncoded
                        // });
                        log.debug('xml_data',xml_data);
                        //输出pdf
                        var xmlString = excelModel.getContents();
                        var template = Handlebars.compile(xmlString);
                        xmlString = template(xml_data);//TODO:template()能传入一个参数，此参数传入xml
                        // log.debug('xmlString',xmlString);
                        var objXlsFile = render.xmlToPdf({xmlString:xmlString});
                        objXlsFile.name = file_type + file_name + '.pdf';
                        objXlsFile.folder = 14;
                        var intFileId = objXlsFile.save();
                        log.debug('intFileId',intFileId);
                        if(intFileId){
                            //赋值打印预览
                            setPdf(rec_type,recid,intFileId);
                            //返回数据给公共客户端脚本
                            if(rec_type == 'customrecord_sl_baojo'){
                                context.response.write({output:'Y_1'});
                            }
                            else if(rec_type == 'customrecord_sl_qu'){
                                context.response.write({output:'Y_2'});
                            }
                            else if(rec_type == 'itemfulfillment'){
                                context.response.write({output:'Y_3'});
                            }
                            else if(rec_type == 'purchaseorder'){
                                context.response.write({output:'Y_4'});
                            }
                            else if(rec_type == 'salesorder'){
                                log.debug('Y-5');
                                context.response.write({output:'Y_5'});
                            }
                            else{
                                context.response.write({output:'Y'});
                            }
                        }
                    }else{
                        context.response.write({output:'N'});
                    }
                }
            }catch(e){
                context.response.write({output:'N'});
                log.debug('生成PDF出错',e);
            }
        }
        //阿拉伯数字转换成大写汉字
        function numberParseChina(money){
            // log.debug('转换金额',money);
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
            var cnIntLast = '圆';
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
        function getPoData(po_id){
            var items = new Array();
            var item_amount = new Array();
            var sum = parseInt(0);
            if(po_id){
                var rec = record.load({
                    type:'purchaseorder',
                    id:po_id,
                    isDynamic:true,
                });
                var count = rec.getLineCount('item');
                for(var i = 0;i < count;i++){
                    rec.selectLine('item',i);
                    var item_t = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'item',
                    });
                    var brand = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_y_so_brand',
                    });
                    var des = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'description',
                    });
                    var miaoshu = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_sl_spo_description',
                    })
                    var qty = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity',
                    });
                    var unit = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'unit',
                    });
                    var rate = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'rate',
                    });
                    var amount = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'amount',
                    });
                    var line_memo = rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_sl_cgmxbz',
                    });
                    var cus_unit = rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'custcol_sl_dayingdanwei',
                    });
                    log.debug('rate qty amount sum parseInt(amount)',rate + '---' + qty + '---' + amount + '----' + sum + '---' + parseFloat(amount));
                    // sum += Number(rate) * Number(qty);
                    sum = parseInt(sum) + parseFloat(amount);
                    items.push({
                        "cpxh" : item_t,
                        "brand" : brand,
                        "des" : des,
                        "qty" : qty,
                        "unit" : unit,
                        "rate" : rate,
                        "amount" : amount,
                        "line_memo" : line_memo,
                        "miaoshu":miaoshu,
                        "cusUnit":cus_unit,
                        "sum" : sum,
                    });
                    item_amount.push(amount);
                }
                //供应商信息
                // var vendorRec = record.load({type:'vendor',id:rec.getValue('entity'),isDynamic:true});
                //地点信息
                // var locationRec = record.load({type:'location',id:rec.getValue('location'),isDynamic:true});
            }
            return {
                "items" : items,
                // "total" : total,
                "orderNo" : rec.getValue('tranid'),
                "orderDate" : rec.getText('trandate'),
                "employee" : rec.getText('employee'),
                "employeeEnglish" : rec.getText('custbody_sl_cgyywm'),
                "employeePhone" : rec.getValue('custbody_sl_lxdh'),
                "vendorCompany" : rec.getText('custbody_sl_so_vendorn'),
                "vendorAddr" : rec.getText('custbody_sl_gysdz'),
                "vendorPhone" : rec.getValue('custbody_sl_lxdh'),
                "vendorEmail" : rec.getValue('custbody_sl_gysyx'),
                "vendorEmpolyee" : rec.getText('custbody_sl_lxr'),
                "vendorPayType" : rec.getText('custbody_sl_gysfkfs'),
                "locationEmpolyee" : rec.getValue('custbody_sl_shflxr'),
                "locationAddr" : rec.getValue('custbody_sl_shdz'),
                "locationCompany" : rec.getValue('custbody_sl_shfgsmc'),
                "locationPhone" : rec.getValue('custbody_sl_shflxfs'),
                "locationEmail" : rec.getValue('custbody_sl_shfyx'),
                "shipTk" : rec.getValue('custbody_sl_ystk'),
            }
        }
        function getSoData(so_id){
            var items = new Array();
            if(so_id){
                var so_rec = record.load({
                    type:'salesorder',
                    id:so_id,
                    isDynamic:true
                });
                var count = so_rec.getLineCount('item');
                for(var i = 0;i < count;i++){
                    so_rec.selectLine('item',i);
                    var cpxh = so_rec.getCurrentSublistText({
                        sublistId:'item',
                        fieldId:'custcol_sl_cpxh',
                    });
                    var qty = so_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'quantity'
                    });
                    var so_item = so_rec.getCurrentSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                    });
                    var so_flag = checkItemType(so_item);
                    if(so_flag == 'item'){
                        items.push({
                            "cpxh" : cpxh,
                            "qty" : qty,
                            "str" : cpxh + '，' + '数量' + '：' + qty,
                        });
                    }
                }
            }
            var ps_data = so_rec.getText('custbody_sl_sozmmemo');
            var chyq_data = so_rec.getText('custbody_sl_sohqmemo');
            return {
                "soNo" : so_rec.getValue('custbody_sl_bbaojiadan'),
                "country" : so_rec.getText('custbody_sl_sopeis'),
                "shipType" : so_rec.getText('custbody_sl_spo_transway'),
                "bxType" : so_rec.getText('custbody_sl_so_baox'),
                "khInfo" : so_rec.getText('custbody_sl_ywyywm') + '---' + so_rec.getText('custbody_sl_so_custdiq'),
                "ps" : ps_data,
                "chyq" : chyq_data,
                "soYd" : so_rec.getText('custbody_sl_so_yundh'),
                "items" : items,
            }
        }
        function getRecData(rec_id,rec_t){
            var so_info = new Object();
            var tk_info;
            var bank_info;
            if(rec_id){
                var so_rec;
                if(rec_t.indexOf('销售') != -1){
                    so_rec = record.load({type:'salesorder',id:rec_id});
                }
                else if(rec_t.indexOf('报价') != -1){
                    so_rec = record.load({type:'estimate',id:rec_id});
                }
                var tiaokuan = so_rec.getValue('custbody_sl_spo_tiaokxx');//条款信息
                var bank = so_rec.getValue('custbody_sl_spo_yhxx');//银行信息
                if(tiaokuan){
                    tk_info = record.load({type:'customrecord_sl_tiaokuanxxw',id:tiaokuan,isDynamic:true}).getValue('custrecord_sl_tkxxxx');
                }
                if(bank){
                    bank_info = record.load({type:'customrecord_sl_yhxxpzb',id:bank,isDynamic:true}).getValue('custrecord_sl_yhxxxx');
                }
            }
            so_info.tk_info = tk_info;
            so_info.bank_info = bank_info;
            return so_info;
        }
        //TODO:阿拉伯数字转英文数字
        function getNumberEnglish(number){
            log.debug('要转的数字',number);
            var ret = 'Zero';
            if(number){
                if(number <= 20){
                    ret = oneNumber(number);
                }
                else if(number > 20){
                    var englisg1Arr = [
                        {"key":1,"value":"One"},{"key":2,"value":'Two'},{"key":3,"value":'Three'},{"key":4,"value":'Four'},{"key":5,"value":'Five'},
                        {"key":6,"value":'Six'},{"key":7,"value":'Seven'},{"key":8,"value":'Eight'},{"key":9,"value":'Nine'},
                    ];
                    var englisg2Arr = [
                        {"key":2,"value":"Twenty"},{"key":3,"value":'Thirty'},{"key":4,"value":'Forty'},{"key":5,"value":'Fifty'},{"key":6,"value":'Sixty'},
                        {"key":7,"value":'Seventy'},{"key":8,"value":'Eighty'},{"key":9,"value":'Ninety'},
                    ];
                    var hundred = "Hundred";
                    var thousand = "Thousand";
                    if(number == 100){
                        ret = "One Hundred";
                    }
                    else if(number < 100){
                        //
                        var numArr = String(number).split('');//TODO:数字先转字符串
                        log.debug('numArr',numArr);
                        for(var e = 0;e < englisg2Arr.length;e++){
                            if(numArr[0] == englisg2Arr[e].key){
                                for(var n = 0; n < englisg1Arr.length;n++){
                                    if(numArr[1] == 0){
                                        ret = englisg2Arr[e].value;
                                        break;
                                    }
                                    else if(numArr[1] == englisg1Arr[n].key){
                                        ret = englisg2Arr[e].value + ' ' + englisg1Arr[n].value;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }else if(number > 100 && number < 1000){
                        var hundredArr = String(number).split('');//TODO:数字先转字符串
                        log.debug('hundredArr',hundredArr);
                        var hundreNum = oneNumber(hundredArr[0]);
                        if(hundredArr[1] == 0 && hundredArr[2] == 0){
                            ret = hundreNum + hundred;
                        }else if(hundredArr[1] == 0){
                            ret = hundreNum + hundred + ' ' + oneNumber(hundredArr[2]);
                        }else if(hundredArr[2] == 0 && hundredArr[1] != 1){
                            ret = hundreNum + hundred + ' ' + tenNumber(hundredArr[1],englisg2Arr);
                        }else {
                            if(hundredArr[1] == 1){
                                var newNum = hundredArr[1] + hundredArr[2];
                                ret = hundreNum + hundred + ' ' + oneNumber(newNum);
                            }else {
                                ret = hundreNum + hundred + ' ' + tenNumber(hundredArr[1],englisg2Arr) + ' ' + oneNumber(hundredArr[2]);
                            }
                        }
                    }
                    else if(number > 1000 && number < 10000){
                        var thousandArr = String(number).split('');//TODO:数字先转字符串
                        log.debug('thousandArr',thousandArr);
                        var thousand_num = oneNumber(thousandArr[0]) + thousand;
                        var hundred_num = oneNumber(thousandArr[1]) + hundred;
                        var ten_num = '';
                        if(thousandArr[2] == 1 || (thousandArr[2] == 2 && thousandArr[3]  == 0)){
                            ten_num = oneNumber(Number(thousandArr[2]) * 10 + Number(thousandArr[3]));
                            ret = thousand_num + hundred_num + ten_num;
                        }else if(thousandArr[2] == 0){
                            ret = thousand_num + hundred_num + oneNumber(Number(thousandArr[3]));;
                        }else{
                            ten_num = tenNumber(thousandArr[2],englisg2Arr) + oneNumber(thousandArr[3]);
                            ret = thousand_num + hundred_num + ten_num;
                        }
                    }else if(number > 10000){
                        ret = 'error';
                    }
                }
            }
            return ret;
        }
        function hundred(number,englisg1Arr){
            var ret = 'Zero';
            for(var n = 0; n < englisg1Arr.length;n++){
                if(number == englisg1Arr[n].key){
                    ret = englisg1Arr[n].value;
                    break;
                }
            }
            return ret;
        }
        function tenNumber(number,englisg2Arr){
            var ret = 'Zero';
            for(var e = 0;e < englisg2Arr.length;e++){
                if(number== englisg2Arr[e].key){
                    ret = englisg2Arr[e].value;
                    break;
                }
            }
            return ret;
        }
        function oneNumber(number){
            var ret = 'Zero';
            if(number == 1){ ret = 'One';}
            else if(number == 2){ret = 'Two';}
            else if(number == 3){ret = 'Three';}
            else if(number == 4){ret = 'Four';}
            else if(number == 5){ret = 'Five';}
            else if(number == 6){ret = 'Six';}
            else if(number == 7){ret = 'Seven';}
            else if(number == 8){ret = 'Eight';}
            else if(number == 9){ret = 'Nine';}
            else if(number == 10){ret = 'Ten';}
            else if(number == 11){ret = 'Eleven';}
            else if(number == 12){ret = 'Twelve';}
            else if(number == 13){ret = 'Thirteen';}
            else if(number == 14){ret = 'Fourteen';}
            else if(number == 15){ret = 'Fifteen';}
            else if(number == 16){ret = 'Sixteen';}
            else if(number == 17){ret = 'Seventeen';}
            else if(number == 18){ret = 'Eightteen';}
            else if(number == 19){ret = 'Nineteen';}
            else if(number == 20){ret = 'Twenty';}
            return ret;
        }
        function getFileUrl(id){
          if(id){
              var file_obj = file.load({
                  id:id,
              });
              return 'https://7373203.app.netsuite.com' + file_obj.url;
          }
        }
        function getSaleRepInfo() {
            var rec = record.load({
                type:'customrecord_sl_shipperinformation',
                id:1,
                isDynamic:true,
            });
            var addr = rec.getValue('custrecord_sl_shipper_address1');
            var addr2 = rec.getValue('custrecord_sl_shipper_address2');
            var addr3 = rec.getValue('custrecord_sl_shipper_address3');
            var city = rec.getValue('custrecord_sl_city1');
            var cityCode = rec.getValue('custrecord_sl_country_code');
            var name = rec.getValue('custrecord_sl_fullname');
            var company = rec.getValue('custrecord_sl_company_name');
            var zip = rec.getValue('custrecord_sl_post_code');
            var phone = rec.getValue('custrecord_sl_phone_number');
            var email = rec.getValue('custrecord_sl_email_address');

            return {
                "name" : name,
                "company" : company,
                "zip" : zip,
                "phone" : phone,
                "email" : email,
                "addr" : addr,
                "addr2" : addr2,
                "addr3" : addr3,
                "city" : city,
                "cityCode" : cityCode,
            }
        }
        function getTiaokuan(rec_id,xml_data) {
            var tk = '';
            log.debug('rec_id',rec_id);
            if(rec_id){
                var rec = record.load({
                    type:'customrecord_sl_tiaokuanxxw',
                    id:rec_id,
                    isDynamic:true,
                });
                tk = rec.getValue('custrecord_sl_tkxxxx');
            }
            return {
                "note" : tk,
            };
        }
        function getDetails(rec,rec_type,xml_data) {
            var all_items = new Object();
            var items = new Array();
            var package_items = new Array();
            var packpage_arr = new Array();
            var sum = Number(0);
            var package_sum = Number(0);
            var qty_sum = Number(0);
            var weight_sum = Number(0);
            var packageNoArr = new Array();
            if(rec){
                var count;
                if(rec_type == 'customrecord_sl_baojo'){
                    count = rec.getLineCount('recmachcustrecord17');
                    for(var i = 0;i < count;i++){
                        rec.selectLine('recmachcustrecord17',i);
                        var sku = rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord15'
                        });
                        var item_id = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord15'
                        });
                        var des = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_ms'
                        });
                        var rate = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_hpdj1'
                        });
                        var xiaoji = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_hpxj'
                        });
                        var qty = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_cpsl'
                        });
                        var jiaoqi = rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_jiaoqiww'
                        });
                        var cpxh = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_cpxh',
                        });
                        var shuxing = rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_dyzssx',     ///展示属性
                        })
                        var item_flag = checkItemType(item_id);
                        log.debug('报价单判断费用货品',item_flag);
                        if(item_flag == 'item'){
                            sum += rate * qty;
                            items.push({
                                "no" : Number(i) + 1,
                                "sku" : sku,
                                "des" : des,
                                "cpxh" : cpxh,
                                "rate" : rate,
                                "xiaoji" : xiaoji,
                                "qty" : qty,
                                "jiaoqi" : jiaoqi,
                                "shuxing" : shuxing,
                                "ext" : (rate * qty).toFixed(2),
                                "sum" : (sum).toFixed(2),
                                "currencyDis":xml_data.currencyDis,
                            });
                        }
                    }
                }
                else if(rec_type == 'customrecord_sl_qu'){
                    count = rec.getLineCount('recmachcustrecord_sl_qu_sub');//产品信息
                    for(var j = 0;j < count;j++){
                        rec.selectLine('recmachcustrecord_sl_qu_sub',j);
                        var item_type = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_qu_xh',       //产品型号
                        });
                        var qu_qty= rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_qu_shul',       //
                        });
                        var qu_rate = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_qu_danjj',       //
                        });
                        var qu_des = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_msw',       //
                        });
                        var package_no = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_package_no',       //
                        });
                        var dimension = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_qu_dimension',       //
                        });
                        var weight = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_sl_qu_sub',
                            fieldId:'custrecord_sl_weight_e',
                        })
                        //判断包裹数量
                        if(packpage_arr.indexOf(package_no) == -1 && package_no){
                            // package_sum += 1;
                            //
                            packageNoArr.push(package_no);
                        }
                        sum += qu_qty * qu_rate;
                        qty_sum += Number(qu_qty);
                        weight_sum += Number(weight) * Number(qu_qty);
                        items.push({
                            "no" : package_no,
                            "sku" : item_type,
                            "rate" : qu_rate,
                            "qty" : qu_qty,
                            "ext" : (qu_rate * qu_qty).toFixed(2),
                            "des" : qu_des,
                            "dimension" : dimension,
                            "weight" : (weight * qu_qty).toFixed(2),
                            "sum" : (sum).toFixed(2),
                            "package_sum" : package_sum,
                            "qty_sum" : qty_sum,
                            "weight_sum" : weight_sum,
                            "currencyDis":xml_data.currencyDis,
                        });
                    }
                }
            }
            all_items.items = items;
            if(packageNoArr.length > 0){
                all_items.package_num = getMaxOfArray(packageNoArr);
            }
            return all_items;
        }
        function getMaxOfArray(numArray) {
            return Math.max.apply(null, numArray);
        }
        function getFyDetails(rec,rec_type,cur_t){
            var fyItems = new Array();
            if(rec){
                var sum = Number(0);
                var count;
                if(rec_type == 'customrecord_sl_baojo'){
                    count = rec.getLineCount('recmachcustrecord17');
                    for(var i = 0;i < count;i++){
                        rec.selectLine('recmachcustrecord17',i);
                        var sku = rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord15'
                        });
                        var item_id = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord15'
                        });
                        var cpxh = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_cpxh',
                        });
                        var rate = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_hpdj1'
                        });
                        var qty = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord17',
                            fieldId:'custrecord_sl_cpsl'
                        });
                        var item_flag = checkItemType(item_id);
                        log.debug('报价单判断费用货品',item_flag);
                        if(item_flag == 'otherchargeitem'){
                            log.debug('in fy');
                            sum += Number(rate) * Number(qty);
                            fyItems.push({
                                "sku" : sku,
                                "ext" : rate * qty,
                                "qty" : qty,
                                "rate" : rate,
                                "cpxh" : cpxh,
                                "sum" :sum,
                                "currencyDis" : cur_t,
                            });
                        }
                    }
                }
                else if(rec_type == 'customrecord_sl_qu'){
                    count = rec.getLineCount('recmachcustrecord_cl_match');//费用货品明细
                    for(var j = 0;j < count;j++){
                        rec.selectLine('recmachcustrecord_cl_match',j);
                        var item_name = rec.getCurrentSublistText({
                            sublistId:'recmachcustrecord_cl_match',
                            fieldId:'custrecord15',       //货品
                        });
                        var qu_rate = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_cl_match',
                            fieldId:'custrecord_sl_hpdj1',       //单价
                        });
                        var qu_qty = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_cl_match',
                            fieldId:'custrecord_sl_cpsl',       //数量
                        });
                        var qu_cpxh = rec.getCurrentSublistValue({
                            sublistId:'recmachcustrecord_cl_match',
                            fieldId:'custrecord_sl_cpxh',
                        })
                        sum += Number(qu_rate) * Number(qu_qty);
                        fyItems.push({
                            "sku" : item_name,
                            "cpxh" : qu_cpxh,
                            "ext" : qu_rate * qu_qty,
                            "sum" : sum,
                            "currencyDis" : cur_t,
                        });
                    }
                }
            }
            return fyItems;
        }
        function checkItemType(item){
            var otheritem_search = search.create({
                type:'otherchargeitem',             //TODO：费用货品类型
                columns:['name','internalid'],
                filters:[['internalid','is',item]]
            });
            var otheritem_res = otheritem_search.run().getRange(0,1);
            log.debug('otheritem_res',JSON.stringify(otheritem_res));
            if(otheritem_res.length > 0){
                return 'otherchargeitem';
            }else{
                return 'item';
            }
         }
        function setPdf(rec_type,recid,intFileId) {
            if(recid && rec_type){
                var feild;
                if(rec_type == 'customrecord_sl_baojo'){
                    feild = 'custrecord_sl_dy_pdf';
                }
                else if(rec_type == 'customrecord_sl_qu'){
                    feild = 'custrecord_sl_report_pdf';
                }
                else if(rec_type == 'itemfulfillment' || rec_type == 'salesorder' || rec_type == 'vendorbill' || rec_type == 'purchaseorder'){
                    feild = 'custbody_sl_report_pdf';
                }
                log.debug('rec_type recid feild',rec_type + '--' + recid + '---' + feild);
                var rec = record.load({
                    type:rec_type,
                    id:recid,
                    isDynamic:true,
                });
                rec.setValue(feild,intFileId);
                rec.save();
                log.debug('succsess');
            }
        }
        return {
            onRequest : onRequest
        };

    });