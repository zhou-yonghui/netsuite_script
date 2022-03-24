/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/file', '../CL_REPORT_UTIL', 'N/encode'], function (search, file, reportUtil, encode) {

    function onRequest(context) {
        var result_str = {};
        result_str.data = '生成成功';
        try {
            var request = context.request;
            var params = request.parameters; //参数
            var bill_id = params.id;
            log.debug('bill_id', bill_id);
            //获取单据信息
            var bill_data = getBillImfo(bill_id);
            log.debug('bill_data:', bill_data);
            var model = file.load({
                id: "SuiteScripts/PrintBill/CIPrint/CI_PRINT.xml"
            });
            var xlsXML = reportUtil.renderPage(model.getContents(), bill_data);
            var folderId = reportUtil.getFolderId("SuiteScripts/PrintBill/CIPrint/CIFile");
            var fileName = 'CI单据导出' + bill_data.inv_no;
            var fileObj = file.create({
                name: fileName,
                fileType: file.Type.EXCEL,
                contents: encode.convert({
                    string: xlsXML,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                }),
                encoding: file.Encoding.UTF8,
                folder: folderId,
                isOnline: true
            });
            // 保存文件
            var file_id = fileObj.save();
            log.debug('file_id', file_id);
            result_str.file_id = file_id;
        } catch (e) {
            log.debug('e', e);
            result_str.data = e.message;
            result_str.file_id = '';
        }
        context.response.write(JSON.stringify(result_str));
    }

    //获取单据信息
    function getBillImfo(bill_id) {
        var data = {}, limit = 4000;
        var inv_date, inv_no, shipper, address, importer, address1, imp_no, del_con, address2, notify_party, terms, item_arr = [];
        search.create({
            type: 'customrecord_hl_bsq_ci_title',
            filters:
                [
                    ['internalid', 'anyof', bill_id]
                ],
            columns:
                [
                    'name',//INV No    0
                    'custrecord_hl_bsq_invdate',//INV Date   1
                    'custrecord_sl_subsidirary',//Shipper   2
                    'custrecord_hl_bsq_ci_address',//Address   3
                    'custrecord_sl_importer',//Importer：    4
                    'custrecord_hl_bsq_ci_address1',//Address     5
                    'custrecord_sl_importer_no',//importer NO2   6
                    'custrecord_hl_bsq_delivery',//Delivery to/Ultimate Consignee    7
                    'custrecord_address_sl',//Address    8
                    'custrecord_sl_notify_party',//Notify party    9
                    'custrecord_hl_bsq_ci_title_list.custrecord_sl_sku_ci',//SKU    10
                    'custrecord_hl_bsq_ci_title_list.custrecord_sl_model_spu',//Model    11
                    'custrecord_hl_bsq_ci_title_list.custrecord_hl_bsq_description_of_goods',//Description Of Goods   12
                    'custrecord_hl_bsq_ci_title_list.custrecord_sl_hs_code_c',//HS CODE   13
                    'custrecord_hl_bsq_ci_title_list.custrecord_hl_bsq_container_no',//Container No   14
                    'custrecord_hl_bsq_ci_title_list.custrecord_country_of_origin',//Country of Origin   15
                    'custrecord_hl_bsq_ci_title_list.custrecord_hl_bsq_ci_quantity',//Quantity   16
                    'custrecord_hl_bsq_ci_title_list.custrecord_hl_bsq_ci_unit_price',//Unit Price   17
                    'custrecord_hl_bsq_ci_title_list.custrecord_hl_bsq_amount',//Amount   18
                    'custrecord_sl_filp_fc12',//FILP FC（AGL调配后FC） 19
                    'custrecord_hl_bsq_ci_title_list.custrecord_sl_currency1',//货币 20
                    'custrecord_baoguanguojia',//IMPORTER NO1 21
                    'custrecord_sl_terms'//TERMS 22
                ]
        }).run().each(function (result) {
            inv_no = result.getValue(result.columns[0]);
            inv_date = result.getValue(result.columns[1]);
            shipper = result.getValue(result.columns[2]);
            address = result.getValue(result.columns[3]);
            importer = result.getValue(result.columns[4]);
            address1 = result.getValue(result.columns[5]);
            imp_no = result.getValue(result.columns[21]) + '\r' + result.getValue(result.columns[6]);
            del_con = result.getValue(result.columns[7]);
            address2 = result.getValue(result.columns[8]) + ' ' + result.getText(result.columns[19]);
            notify_party = result.getValue(result.columns[9]);
            terms = result.getText(result.columns[22]);
            item_arr.push({
                sku_id: result.getValue(result.columns[10]),
                sku: result.getText(result.columns[10]),
                model: result.getValue(result.columns[11]),
                des_goods: result.getValue(result.columns[12]),
                hs_code: result.getValue(result.columns[13]),
                container_no: result.getValue(result.columns[14]),
                country_origin: result.getValue(result.columns[15]),
                quantity: result.getValue(result.columns[16]),
                unit_price: result.getValue(result.columns[17]),
                amount: result.getValue(result.columns[18]),
                currency_text: result.getText(result.columns[20])
            });
            return --limit > 0;
        });
        //将同一个SKU和柜号加总显示一行
        var item_list = [], items = [], total_amount = 0;
        if (item_arr.length > 0) {
            for (var i = 0; i < item_arr.length; i++) {
                total_amount = Number(total_amount) + Number(item_arr[i].amount);
                if (items.indexOf(item_arr[i].sku_id + item_arr[i].container_no) == -1) {
                    item_list.push({
                        sku_id: item_arr[i].sku_id,
                        sku: item_arr[i].sku,
                        model: item_arr[i].model,
                        des_goods: item_arr[i].des_goods,
                        hs_code: item_arr[i].hs_code,
                        container_no: item_arr[i].container_no,
                        country_origin: item_arr[i].country_origin,
                        quantity: item_arr[i].quantity,
                        unit_price: item_arr[i].unit_price,
                        amount: item_arr[i].amount,
                        currency_text: item_arr[i].currency_text
                    })
                    items.push(item_arr[i].sku_id + item_arr[i].container_no);
                } else {
                    for (var j = 0; j < item_list.length; j++) {
                        if (item_list[j].sku_id == item_arr[i].sku_id && item_list[j].container_no == item_arr[i].container_no) {
                            item_list[j].quantity = (Number(item_list[j].quantity) + Number(item_arr[i].quantity)).toFixed(2);
                            item_list[j].amount = (Number(item_list[j].amount) + Number(item_arr[i].amount)).toFixed(2);
                            break;
                        }
                    }
                }
            }
            for (var i = 0; i < item_list.length; i++) {
                if (item_list[i].unit_price && item_list[i].unit_price != 0) {
                    item_list[i].unit_price = item_list[i].currency_text + item_list[i].unit_price;
                }
                if (item_list[i].amount && item_list[i].amount != 0) {
                    item_list[i].amount = item_list[i].currency_text + item_list[i].amount;
                }
            }
        }
        data.inv_no = inv_no;
        data.inv_date = inv_date;
        data.shipper = shipper;
        data.address = address;
        data.importer = importer;
        data.address1 = address1;
        data.imp_no = imp_no;
        data.del_con = del_con;
        data.address2 = address2;
        data.notify_party = notify_party;
        data.terms = terms;
        data.rows = item_list;
        var need_total_amount = 0;
        if (total_amount && total_amount != 0) {
            need_total_amount = item_list[0].currency_text + total_amount.toFixed(2);
        }
        data.total_amount = need_total_amount;
        return data;
    }

    return {
        onRequest: onRequest
    }
});
