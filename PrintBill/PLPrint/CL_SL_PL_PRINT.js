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
                id: "SuiteScripts/PrintBill/PLPrint/PL_PRINT.xml"
            });
            var xlsXML = reportUtil.renderPage(model.getContents(), bill_data);
            var folderId = reportUtil.getFolderId("SuiteScripts/PrintBill/PLPrint/PLFile");
            var fileName = 'PL单据导出' + bill_data.inv_no;
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
        var inv_date, inv_no, shipper, address, importer, address1, imp_no, del_con, address2, notify_party, terms, rows = [], item_arr = [], shipments_arr = [];
        search.create({
            type: 'customrecord_bsq_pl',
            filters:
                [
                    ['internalid', 'anyof', bill_id]
                ],
            columns:
                [
                    'custrecord_inv_no_pl',//INV No    0
                    'custrecord_inv_date',//INV Date   1
                    'custrecord_sl_shipper12',//Shipper   2
                    'custrecord_address_pl',//Address   3
                    'custrecord_ssl_importer',//Importer：    4
                    'custrecord_address_pl2',//Address     5
                    'custrecord_sl_importer_no12',//importer NO2   6
                    'custrecord_delivery_to',//Delivery to/Ultimate Consignee    7
                    'custrecord_sl_address3',//Address    8
                    'custrecord_sl_notify_party1',//Notify party    9
                    'custrecord_relation_pl.custrecord_purchase_order',//SKU    10
                    'custrecord_relation_pl.custrecord_model_no',//Model No    11
                    'custrecord_relation_pl.custrecord_description_of_goods_pl',//Description Of Goods   12
                    'custrecord_relation_pl.custrecord_container_no',//Container No   13
                    'custrecord_relation_pl.custrecord_quantity_pl',//Quantity（PCS）   14
                    'custrecord_relation_pl.custrecord_package',//Package（CTNS）  15
                    'custrecord_relation_pl.custrecord_net_weight_pl',//Net Weight（KG）   16
                    'custrecord_relation_pl.custrecord_gross_weight_pl',//Gross Weight（KG）   17
                    'custrecord_relation_pl.custrecord_cbm_pl',//CBM   18
                    'custrecord_relation_pl.custrecord_sl_shipmentid12',//shipmentID 19 
                    'custrecord_relation_pl.custrecord_sl_reference_id12',//Reference ID  20
                    'custrecord_relation_pl.custrecord_sl_texture_of_material',//材质 Material/Application  21
                    'custrecord_relation_pl.custrecord_sl_parameter',//参数 Material/Application  22
                    'custrecord_sl_pl_importerno2',//importer NO1 23
                    'custrecord_sl_terms12'// TERMS 24
                ]
        }).run().each(function (result) {
            inv_no = result.getValue(result.columns[0]);
            inv_date = result.getValue(result.columns[1]);
            shipper = result.getValue(result.columns[2]);
            address = result.getValue(result.columns[3]);
            importer = result.getValue(result.columns[4]);
            address1 = result.getValue(result.columns[5]);
            imp_no = result.getValue(result.columns[23]) + '\r' + result.getValue(result.columns[6]);
            del_con = result.getValue(result.columns[7]);
            address2 = result.getValue(result.columns[8]);
            notify_party = result.getValue(result.columns[9]);
            terms = result.getText(result.columns[24]);
            item_arr.push({
                sku_id: result.getValue(result.columns[10]),
                sku: result.getText(result.columns[10]),
                model_no: result.getValue(result.columns[11]),
                des_goods: result.getValue(result.columns[12]),
                container_no: result.getValue(result.columns[13]),
                quantity: result.getValue(result.columns[14]),
                package: result.getValue(result.columns[15]),
                net_weight: result.getValue(result.columns[16]),
                gross_weight: result.getValue(result.columns[17]),
                cbm: result.getValue(result.columns[18]),
                material_application: result.getValue(result.columns[21]) + result.getValue(result.columns[22])
            });
            shipments_arr.push({
                shipment_id: result.getValue(result.columns[19]),
                reference_id: result.getValue(result.columns[20]),
                package: result.getValue(result.columns[15]),
                quantity: result.getValue(result.columns[14])
            })
            return --limit > 0;
        });
        //将同一个SKU和柜号加总显示一行
        var items = [], item_list = [];
        if (item_arr.length > 0) {
            for (var i = 0; i < item_arr.length; i++) {
                if (items.indexOf(item_arr[i].sku_id + item_arr[i].container_no) == -1) {
                    item_list.push({
                        sku_id: item_arr[i].sku_id,
                        sku: item_arr[i].sku,
                        model_no: item_arr[i].model_no,
                        des_goods: item_arr[i].des_goods,
                        container_no: item_arr[i].container_no,
                        quantity: item_arr[i].quantity,
                        package: item_arr[i].package,
                        net_weight: item_arr[i].net_weight,
                        gross_weight: item_arr[i].gross_weight,
                        cbm: item_arr[i].cbm,
                        material_application: item_arr[i].material_application
                    })
                    items.push(item_arr[i].sku_id + item_arr[i].container_no);
                } else {
                    for (var j = 0; j < item_list.length; j++) {
                        if (item_list[j].sku_id == item_arr[i].sku_id && item_list[j].container_no == item_arr[i].container_no) {
                            item_list[j].quantity = (Number(item_list[j].quantity) + Number(item_arr[i].quantity)).toFixed(2);
                            item_list[j].package = (Number(item_list[j].package) + Number(item_arr[i].package)).toFixed(2);
                            item_list[j].net_weight = (Number(item_list[j].net_weight) + Number(item_arr[i].net_weight)).toFixed(2);
                            item_list[j].gross_weight = (Number(item_list[j].gross_weight) + Number(item_arr[i].gross_weight)).toFixed(2);
                            item_list[j].cbm = (Number(item_list[j].cbm) + Number(item_arr[i].cbm)).toFixed(2);
                            break;
                        }
                    }
                }
            }
        }

        //将同一个shipmentID加总显示一行
        var shipments = [], shipment_list = [];
        if (shipments_arr.length > 0) {
            for (var i = 0; i < shipments_arr.length; i++) {
                if (shipments.indexOf(shipments_arr[i].shipment_id) == -1) {
                    shipment_list.push({
                        shipment_id: shipments_arr[i].shipment_id,
                        reference_id: shipments_arr[i].reference_id,
                        package: shipments_arr[i].package,
                        quantity: shipments_arr[i].quantity
                    })
                    shipments.push(shipments_arr[i].shipment_id);
                } else {
                    for (var j = 0; j < shipment_list.length; j++) {
                        if (shipment_list[j].shipment_id == shipments_arr[i].shipment_id) {
                            shipment_list[j].package = (Number(shipment_list[j].package) + Number(shipments_arr[i].package)).toFixed(2);
                            shipment_list[j].quantity = (Number(shipment_list[j].quantity) + Number(shipments_arr[i].quantity)).toFixed(2);
                            break;
                        }
                    }
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
        data.item_list = item_list;
        data.shipment_list = shipment_list;
        return data;
    }

    return {
        onRequest: onRequest
    }
});
