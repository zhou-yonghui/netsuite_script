/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *数量处理
 */
 define(['N/search', 'N/runtime', '../utils/moment', 'N/record', 'N/task'], function (search, runtime, moment, record, task) {

    function getInputData() {
        try {
            //获取数量
            var data = getItemQuantity();
            log.debug('data', data);
            log.debug('data', data.length);
          //return
            return data;
        } catch (e) {
            log.debug('e', e);
        }
    }

    //获取月初月末日期
    function getMonthData() {
        var year = runtime.getCurrentScript().getParameter('custscript_need_year');
        var month = runtime.getCurrentScript().getParameter('custscript_need_month');
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var monthSelected = moment(year + month, 'YYYYMM');
        var startOfMonthObject = moment(monthSelected);
        startOfMonthObject.startOf('month');
        startOfMonth = startOfMonthObject.format(dateFormat);
        log.debug('startOfMonth', startOfMonth);
        var endOfMonthObject = moment(monthSelected);
        endOfMonthObject.endOf('month');
        endOfMonth = endOfMonthObject.format(dateFormat);
        log.debug('endOfMonth', endOfMonth);
        var data = {};
        data.startOfMonth = startOfMonth;
        data.endOfMonth = endOfMonth;
        return data;
    }

    //获取对应数量
    function getItemQuantity() {
        var month_data = getMonthData();
        var start = 0, rec_data = [], need_data = [];
        var transactionSearchObj = search.create({
            type: 'transaction',
            filters:
                [
                    ['posting', 'is', 'T'],
                    'AND',
                    ['account', 'anyof', '570'],//测试环境 465
                    'AND',
                    ['trandate', 'within', month_data.startOfMonth, month_data.endOfMonth],
                    'AND',
                    ["formulanumeric: {quantity}","isnotempty",""],
                    //'AND',
                    //['item', 'anyof', [436]],
                    // 'AND',
                    // ['location', 'anyof', ['7043', '8062']]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        join: "subsidiary",
                        summary: "GROUP",
                        label: "内部标识"
                    }),
                    search.createColumn({
                        name: "formulatext",
                        summary: "GROUP",
                        formula: "NVL（{type},0）",
                        label: "类型-测试"
                    }),
                    // search.createColumn({
                    //     name: "type",
                    //     summary: "GROUP",
                    //     label: "类型"
                    // }),
                    search.createColumn({
                        name: "formulatext",
                        summary: "GROUP",
                        formula: "NVL（{createdfrom.type},0）",
                        label: "创建自类型-测试"
                    }),
                    // search.createColumn({
                    //     name: "type",
                    //     join: "createdFrom",
                    //     summary: "GROUP",
                    //     label: "创建自类型"
                    // }),
                    search.createColumn({
                        name: "formulatext",
                        summary: "GROUP",
                        formula: "NVL（{custbody_iatype2},0）",
                        label: "库存调整类型-测试"
                    }),
                    // search.createColumn({
                    //     name: "custbody_iatype2",
                    //     summary: "GROUP",
                    //     label: "库存调整类型"
                    // }),
                    search.createColumn({
                        name: "location",
                        summary: "GROUP",
                        label: "地点"
                    }),
                    search.createColumn({
                        name: "item",
                        summary: "GROUP",
                        label: "货品"
                    }),
                    search.createColumn({
                        name: "quantity",
                        summary: "SUM",
                        label: "数量"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        summary: "GROUP",
                        formula: "NVL(case when {quantity} >0 then 1 else 2 end,0)",
                        label: "出入库类型"
                    }),
                ]
        });
        var searchResultCount = transactionSearchObj.runPaged().count;
        log.debug('transactionSearchObj result count', searchResultCount);
        do {
            var results = transactionSearchObj.run().getRange({
                start: start,
                end: start + 1000
            });
            for (var i = 0; i < results.length; i++) {
                var location_num = results[i].getValue(transactionSearchObj.columns[4]) ? results[i].getValue(transactionSearchObj.columns[4]) : 'a';
                var item_num = results[i].getValue(transactionSearchObj.columns[5]) ? results[i].getValue(transactionSearchObj.columns[5]) : 'b';
                var line_num = ('item-' + location_num + '-' + item_num + '-').toString();
                need_data.push({
                    subsidiary: results[i].getValue(transactionSearchObj.columns[0]) ? results[i].getValue(transactionSearchObj.columns[0]) : 'c',
                    type: results[i].getValue(transactionSearchObj.columns[1]) ? results[i].getValue(transactionSearchObj.columns[1]) : 'd',
                    createdFrom_type: results[i].getValue(transactionSearchObj.columns[2]) ? results[i].getValue(transactionSearchObj.columns[2]) : 'e',
                    custbody_iatype2: results[i].getValue(transactionSearchObj.columns[3]) ? results[i].getValue(transactionSearchObj.columns[3]) : 'f',
                    location: results[i].getValue(transactionSearchObj.columns[4]) ? results[i].getValue(transactionSearchObj.columns[4]) : 'g',
                    item: results[i].getValue(transactionSearchObj.columns[5]) ? results[i].getValue(transactionSearchObj.columns[5]) : 'h',
                    quantity: results[i].getValue(transactionSearchObj.columns[6]) ? results[i].getValue(transactionSearchObj.columns[6]) : 'i',
                    line_num: line_num
                })
            }
            start += 1000;
        } while (results.length > 0);
        log.debug('need_data', need_data);
        log.debug('need_data', need_data.length);
        if (need_data.length > 0) {
            var handle_data = [];
            for (var i = 0; i < need_data.length; i++) {
                var line_str = need_data[i].line_num;
                if (handle_data.indexOf(line_str) == -1) {
                    handle_data.push(line_str);
                    var po_add_quantity = 0,
                        transfer_into_quantity = 0,
                        transfer_out_quantity = 0,
                        so_out_quantity = 0,
                        inventory_profit = 0,
                        number_of_loss = 0,
                        scrap_quantity = 0;
                    //类型为“货品收据(ItemRcpt)”“货品实施情况(ItemShip)”且创建自类型为“采购订单(PurchOrd)”“供应商退货审批(VendAuth)”的数量+
                    //类型为“库存调整(InvAdjst)”，且“库存调整类型”不为“盘点(1)”且不为“报废毁损(3)”且不为“盘库(10)”的＞0的数量
                    if (((need_data[i].type == '货品收据' || need_data[i].type == '货品实施情况') &&
                        (need_data[i].createdFrom_type == '采购订单' || need_data[i].createdFrom_type == '供应商退货审批')) ||
                        (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 != '盘点' && need_data[i].custbody_iatype2 != '报废毁损' &&
                            need_data[i].custbody_iatype2 != '盘库' && Number(need_data[i].quantity) > 0)
                    ) {
                        po_add_quantity = Number(po_add_quantity) + Number(need_data[i].quantity);
                    }
                    //类型为“库存转移(InvTrnfr)”且数量＞0的数量+类型为“货品收据(ItemRcpt)”且创建自类型为“库存转移订单(TrnfrOrd)”的数量
                    if ((need_data[i].type == '库存转移' && Number(need_data[i].quantity) > 0) || (need_data[i].type == '货品收据' && need_data[i].createdFrom_type == '库存转移订单')) {
                        transfer_into_quantity = Number(transfer_into_quantity) + Number(need_data[i].quantity);
                    }
                    //类型为“库存转移(InvTrnfr)”且数量＜0的数量+类型为“货品实施情况(ItemShip)”且创建自类型为“库存转移订单(TrnfrOrd)”的数量
                    if ((need_data[i].type == '库存转移' && Number(need_data[i].quantity) < 0) || (need_data[i].type == '货品实施情况' && need_data[i].createdFrom_type == '库存转移订单')) {
                        transfer_out_quantity = Number(transfer_out_quantity) + Number(need_data[i].quantity);
                    }
                    //类型为“货品收据(ItemRcpt)”“货品实施情况(ItemShip)”且创建自类型为“销售订单(SalesOrd)”“退货授权(RtnAuth)”的数量+
                    //类型为“库存调整(InvAdjst)”，且“库存调整类型”不为“盘点(1)”且不为“报废毁损(3)”且不为“盘库(10)”的＜0的数量
                    if (((need_data[i].type == '货品收据' || need_data[i].type == '货品实施情况') && (need_data[i].createdFrom_type == '销售订单' || need_data[i].createdFrom_type == '退货授权')) ||
                        (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 != '盘点' && need_data[i].custbody_iatype2 != '报废毁损' && need_data[i].custbody_iatype2 != '盘库' && Number(need_data[i].quantity) < 0)
                    ) {
                        so_out_quantity = Number(so_out_quantity) + Number(need_data[i].quantity);
                    }
                    //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“盘点(1)”或者为“盘库(10)”且数量＞0
                    if (need_data[i].type == '库存调整' && (need_data[i].custbody_iatype2 == '盘点' || need_data[i].custbody_iatype2 == '盘库') && Number(need_data[i].quantity) > 0) {
                        inventory_profit = Number(inventory_profit) + Number(need_data[i].quantity);
                    }
                    //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“盘点(1)”或者为“盘库(10)”且数量＜0
                    if (need_data[i].type == '库存调整' && (need_data[i].custbody_iatype2 == '盘点' || need_data[i].custbody_iatype2 == '盘库') && Number(need_data[i].quantity) < 0) {
                        number_of_loss = Number(number_of_loss) + Number(need_data[i].quantity);
                    }
                    //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“报废毁损(3)”的数量
                    if (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 == '报废毁损') {
                        scrap_quantity = Number(scrap_quantity) + Number(need_data[i].quantity);
                    }
                    rec_data.push({
                        subsidiary: need_data[i].subsidiary,
                        location: need_data[i].location,
                        item: need_data[i].item,
                        quantity: need_data[i].quantity,
                        po_add_quantity: po_add_quantity,//采购入库数量
                        transfer_into_quantity: transfer_into_quantity, //调拨入库数量
                        transfer_out_quantity: transfer_out_quantity, //调拨出库数量
                        so_out_quantity: so_out_quantity,//销售出库数量
                        inventory_profit: inventory_profit,//盘盈数量
                        number_of_loss: number_of_loss,//盘亏数量
                        scrap_quantity: scrap_quantity//报废数量
                    })
                } else {
                    for (var j = 0; j < rec_data.length; j++) {
                        if (rec_data[j].subsidiary == need_data[i].subsidiary && rec_data[j].location == need_data[i].location && rec_data[j].item == need_data[i].item) {
                            //类型为“货品收据(ItemRcpt)”“货品实施情况(ItemShip)”且创建自类型为“采购订单(PurchOrd)”“供应商退货审批(VendAuth)”的数量+
                            //类型为“库存调整(InvAdjst)”，且“库存调整类型”不为“盘点(1)”且不为“报废毁损(3)”且不为“盘库(10)”的＞0的数量
                            if (((need_data[i].type == '货品收据' || need_data[i].type == '货品实施情况') &&
                                (need_data[i].createdFrom_type == '采购订单' || need_data[i].createdFrom_type == '供应商退货审批')) ||
                                (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 != '盘点' && need_data[i].custbody_iatype2 != '报废毁损' &&
                                    need_data[i].custbody_iatype2 != '盘库' && Number(need_data[i].quantity) > 0)
                            ) {
                                rec_data[j].po_add_quantity = Number(rec_data[j].po_add_quantity) + Number(need_data[i].quantity);
                            }
                            //类型为“库存转移(InvTrnfr)”且数量＞0的数量+类型为“货品收据(ItemRcpt)”且创建自类型为“库存转移订单(TrnfrOrd)”的数量
                            if ((need_data[i].type == '库存转移' && Number(need_data[i].quantity) > 0) || (need_data[i].type == '货品收据' && need_data[i].createdFrom_type == '库存转移订单')) {
                                rec_data[j].transfer_into_quantity = Number(rec_data[j].transfer_into_quantity) + Number(need_data[i].quantity);
                            }
                            //类型为“库存转移(InvTrnfr)”且数量＜0的数量+类型为“货品实施情况(ItemShip)”且创建自类型为“库存转移订单(TrnfrOrd)”的数量
                            if ((need_data[i].type == '库存转移' && Number(need_data[i].quantity) < 0) || (need_data[i].type == '货品实施情况' && need_data[i].createdFrom_type == '库存转移订单')) {
                                rec_data[j].transfer_out_quantity = Number(rec_data[j].transfer_out_quantity) + Number(need_data[i].quantity);
                            }
                            //类型为“货品收据(ItemRcpt)”“货品实施情况(ItemShip)”且创建自类型为“销售订单(SalesOrd)”“退货授权(RtnAuth)”的数量+
                            //类型为“库存调整(InvAdjst)”，且“库存调整类型”不为“盘点(1)”且不为“报废毁损(3)”且不为“盘库(10)”的＜0的数量
                            if (((need_data[i].type == '货品收据' || need_data[i].type == '货品实施情况') && (need_data[i].createdFrom_type == '销售订单' || need_data[i].createdFrom_type == '退货授权')) ||
                                (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 != '盘点' && need_data[i].custbody_iatype2 != '报废毁损' && need_data[i].custbody_iatype2 != '盘库' && Number(need_data[i].quantity) < 0)
                            ) {
                                rec_data[j].so_out_quantity = Number(rec_data[j].so_out_quantity) + Number(need_data[i].quantity);
                            }
                            //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“盘点(1)”或者为“盘库(10)”且数量＞0
                            if (need_data[i].type == '库存调整' && (need_data[i].custbody_iatype2 == '盘点' || need_data[i].custbody_iatype2 == '盘库') && Number(need_data[i].quantity) > 0) {
                                rec_data[j].inventory_profit = Number(rec_data[j].inventory_profit) + Number(need_data[i].quantity);
                            }
                            //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“盘点(1)”或者为“盘库(10)”且数量＜0
                            if (need_data[i].type == '库存调整' && (need_data[i].custbody_iatype2 == '盘点' || need_data[i].custbody_iatype2 == '盘库') && Number(need_data[i].quantity) < 0) {
                                rec_data[j].number_of_loss = Number(rec_data[j].number_of_loss) + Number(need_data[i].quantity);
                            }
                            //类型为“库存调整(InvAdjst)”，且“库存调整类型”为“报废毁损(3)”的数量
                            if (need_data[i].type == '库存调整' && need_data[i].custbody_iatype2 == '报废毁损') {
                                rec_data[j].scrap_quantity = Number(rec_data[j].scrap_quantity) + Number(need_data[i].quantity);
                            }
                        }
                    }
                }
            }
        }
        log.debug('handle_data', handle_data);
        log.debug('handle_data', handle_data.length);
        return rec_data;
    }

    function map(context) {
        try {
            var year = runtime.getCurrentScript().getParameter('custscript_need_year');
            var month = runtime.getCurrentScript().getParameter('custscript_need_month');
            var data = JSON.parse(context.value);
            log.debug('data start', data);
            //期初数量和期末数量
            data = getOtherQuantity(data);
            //获取对应的期初金额、本期增加金额、本期减少金额、期末金额、调拨单价、调拨出库金额
            var month_data = getMonthData();
            var rec_list = getMoney(data, month_data);
            var rec_arr = rec_list.rec_data;
            var acc_arr = rec_list.acc_ids;
            log.debug('根据公司货品地点获取的增加减少金额', rec_list);
            log.debug('data', data);
            var acc_list = ['571', '572', '573', '574', '575', '1469']; // 测试环境 '1028', '1029', '1030', '1356', '1357'
            if (rec_arr.length > 0) {
                //根据公司、地点、货品、科目为维度查询结果总表的期末剩余金额
                var term_arr = getEndTermAmount(data, acc_arr);
                log.debug('根据公司、地点、货品、科目为维度查询结果总表的期末剩余金额', term_arr);
                for (var i = 0; i < rec_arr.length; i++) {
                    //期初金额
                    var start_amount = 0;
                    if (term_arr.length > 0) {
                        for (var j = 0; j < term_arr.length; j++) {
                            if (term_arr[j].subsidary == rec_arr[i].subsidiary_id && term_arr[j].account == rec_arr[i].account_id &&
                                term_arr[j].location == rec_arr[i].location_id && term_arr[j].item == data.item) {
                                if (term_arr[j].end_term_amount && term_arr[j].end_term_amount != 0) {
                                    start_amount = term_arr[j].end_term_amount;
                                    break;
                                }
                            }
                        }
                    }
                    //本期增加金额
                    var add_amount = rec_arr[i].debit_amount;
                    //本期减少金额
                    var reduce_amount = rec_arr[i].credit_amount;
                    //期末金额 = 期初金额+本期增加金额+本期减少金额
                    var end_amount = (Number(start_amount) + Number(add_amount) + Number(reduce_amount)).toFixed(2);
                    //调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量）
                    var divisor_num = Number(data.start_quantity) + Number(data.po_add_quantity) + Number(data.transfer_into_quantity);
                    var to_price = 0;
                    if (divisor_num && divisor_num != 0) {
                        to_price = (Number(end_amount) / Number(divisor_num)).toFixed(2);
                    }
                    //调拨出库金额=调拨出库数量*调拨单价 
                    var transfer_out_amount = (Number(data.transfer_out_quantity) * Number(to_price)).toFixed(2);
                    var freight_month = record.create({ type: 'customrecord_freight_quantity', isDynamic: true });
                    freight_month.setValue('custrecord_subsidary99', data.subsidiary);
                    freight_month.setValue('custrecord_year99', year);
                    freight_month.setValue('custrecord_month99', month);
                    freight_month.setValue('custrecord_location99', data.location);
                    freight_month.setValue('custrecord_item99', data.item);
                    freight_month.setValue('custrecord_account99', rec_arr[i].account_id);
                    freight_month.setValue('custrecord_start_quantity22', data.start_quantity);//期初库存
                    freight_month.setValue('custrecord_po_add_quantity22', data.po_add_quantity);//采购入库数量
                    freight_month.setValue('custrecord_transfer_into_quantity22', data.transfer_into_quantity);//调拨入库数量
                    freight_month.setValue('custrecord_transfer_out_quantity22', data.transfer_out_quantity);//调拨出库数量
                    freight_month.setValue('custrecord_so_out_quantity22', data.so_out_quantity);//销售出库数量
                    freight_month.setValue('custrecord_inventory_profit22', data.inventory_profit);//盘盈数量
                    freight_month.setValue('custrecord_number_of_loss22', data.number_of_loss);//盘亏数量
                    freight_month.setValue('custrecord_scrap_quantity22', data.scrap_quantity);//报废数量
                    freight_month.setValue('custrecord_ending_inventory22', data.ending_inventory);//期末库存
                    freight_month.setValue('custrecord_start_amount33', start_amount);//期初金额
                    freight_month.setValue('custrecord_add_amount33', add_amount);//本期增加金额 
                    freight_month.setValue('custrecord_reduce_amount33', reduce_amount);//本期减少金额 
                    freight_month.setValue('custrecord_end_amount33', end_amount);//期末金额 = 期初金额+本期增加金额-本期减少金额 
                    freight_month.setValue('custrecord_to_price', to_price);//调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量） 
                    freight_month.setValue('custrecord_transfer_out_amount22', transfer_out_amount);//调拨出库金额=调拨出库数量*调拨单价 
                    var freight_month_id = freight_month.save();
                    if (freight_month_id) {
                        log.debug('success', '创建头程月末结转报表成功' + freight_month_id);
                        context.write('result', year + '-' + month);
                    }
                }
                //将没有的科目进行补齐
                var need_arr_list = [];
                for (var i = 0; i < acc_list.length; i++) {
                    if (acc_arr.indexOf(acc_list[i]) == -1) {
                        need_arr_list.push(acc_list[i]);
                    }
                }
                log.debug('need_arr_list', need_arr_list);
                if (need_arr_list.length > 0) {
                    //根据公司、地点、货品、科目为维度查询结果总表的期末剩余金额
                    var term_arr = getEndTermAmount(data, need_arr_list);
                    for (var i = 0; i < need_arr_list.length; i++) {
                        //期初金额
                        var start_amount = 0;
                        if (term_arr.length > 0) {
                            for (var j = 0; j < term_arr.length; j++) {
                                if (term_arr[j].account == need_arr_list[i]) {
                                    if (term_arr[j].end_term_amount && term_arr[j].end_term_amount != 0) {
                                        start_amount = term_arr[j].end_term_amount;
                                        break;
                                    }
                                }
                            }
                        }
                        //本期增加金额
                        var add_amount = 0;
                        //本期减少金额
                        var reduce_amount = 0;
                        //期末金额 = 期初金额+本期增加金额-本期减少金额
                        var end_amount = (Number(start_amount) + Number(add_amount) - Number(reduce_amount)).toFixed(2);
                        //调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量）
                        var divisor_num = Number(data.start_quantity) + Number(data.po_add_quantity) + Number(data.transfer_into_quantity);
                        var to_price = 0;
                        if (divisor_num && divisor_num != 0) {
                            to_price = (Number(end_amount) / Number(divisor_num)).toFixed(2);
                        }
                        //调拨出库金额=调拨出库数量*调拨单价 
                        var transfer_out_amount = (Number(data.transfer_out_quantity) * Number(to_price)).toFixed(2);
                        var freight_month = record.create({ type: 'customrecord_freight_quantity', isDynamic: true });
                        freight_month.setValue('custrecord_subsidary99', data.subsidiary);
                        freight_month.setValue('custrecord_year99', year);
                        freight_month.setValue('custrecord_month99', month);
                        freight_month.setValue('custrecord_location99', data.location);
                        freight_month.setValue('custrecord_item99', data.item);
                        freight_month.setValue('custrecord_account99', need_arr_list[i]);
                        freight_month.setValue('custrecord_start_quantity22', data.start_quantity);//期初库存
                        freight_month.setValue('custrecord_po_add_quantity22', data.po_add_quantity);//采购入库数量
                        freight_month.setValue('custrecord_transfer_into_quantity22', data.transfer_into_quantity);//调拨入库数量
                        freight_month.setValue('custrecord_transfer_out_quantity22', data.transfer_out_quantity);//调拨出库数量
                        freight_month.setValue('custrecord_so_out_quantity22', data.so_out_quantity);//销售出库数量
                        freight_month.setValue('custrecord_inventory_profit22', data.inventory_profit);//盘盈数量
                        freight_month.setValue('custrecord_number_of_loss22', data.number_of_loss);//盘亏数量
                        freight_month.setValue('custrecord_scrap_quantity22', data.scrap_quantity);//报废数量
                        freight_month.setValue('custrecord_ending_inventory22', data.ending_inventory);//期末库存
                        freight_month.setValue('custrecord_start_amount33', start_amount);//期初金额
                        freight_month.setValue('custrecord_add_amount33', add_amount);//本期增加金额 
                        freight_month.setValue('custrecord_reduce_amount33', reduce_amount);//本期减少金额 
                        freight_month.setValue('custrecord_end_amount33', end_amount);//期末金额 = 期初金额+本期增加金额-本期减少金额 
                        freight_month.setValue('custrecord_to_price', to_price);//调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量） 
                        freight_month.setValue('custrecord_transfer_out_amount22', transfer_out_amount);//调拨出库金额=调拨出库数量*调拨单价 
                        var freight_month_id = freight_month.save();
                        if (freight_month_id) {
                            log.debug('success', '创建头程月末结转报表成功' + freight_month_id);
                            context.write('result', year + '-' + month);
                        }
                    }
                }
            } else {
                //没有查出对应的金额需要将所有科目都进行创建
                //根据公司、地点、货品、科目为维度查询结果总表的期末剩余金额
                var term_arr = getEndTermAmount(data, acc_list);
                log.debug('term_arr', term_arr);
                for (var i = 0; i < acc_list.length; i++) {
                    //期初金额
                    var start_amount = 0;
                    if (term_arr.length > 0) {
                        for (var j = 0; j < term_arr.length; j++) {
                            if (term_arr[j].account == acc_list[i]) {
                                if (term_arr[j].end_term_amount && term_arr[j].end_term_amount != 0) {
                                    start_amount = term_arr[j].end_term_amount;
                                    break;
                                }
                            }
                        }
                    }
                    //本期增加金额
                    var add_amount = 0;
                    //本期减少金额
                    var reduce_amount = 0;
                    //期末金额 = 期初金额+本期增加金额-本期减少金额
                    var end_amount = (Number(start_amount) + Number(add_amount) - Number(reduce_amount)).toFixed(2);
                    //调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量）
                    var divisor_num = Number(data.start_quantity) + Number(data.po_add_quantity) + Number(data.transfer_into_quantity);
                    var to_price = 0;
                    if (divisor_num && divisor_num != 0) {
                        to_price = (Number(end_amount) / Number(divisor_num)).toFixed(2);
                    }
                    //调拨出库金额=调拨出库数量*调拨单价 
                    var transfer_out_amount = (Number(data.transfer_out_quantity) * Number(to_price)).toFixed(2);
                    var freight_month = record.create({ type: 'customrecord_freight_quantity', isDynamic: true });
                    freight_month.setValue('custrecord_subsidary99', data.subsidiary);
                    freight_month.setValue('custrecord_year99', year);
                    freight_month.setValue('custrecord_month99', month);
                    freight_month.setValue('custrecord_location99', data.location);
                    freight_month.setValue('custrecord_item99', data.item);
                    freight_month.setValue('custrecord_account99', acc_list[i]);
                    freight_month.setValue('custrecord_start_quantity22', data.start_quantity);//期初库存
                    freight_month.setValue('custrecord_po_add_quantity22', data.po_add_quantity);//采购入库数量
                    freight_month.setValue('custrecord_transfer_into_quantity22', data.transfer_into_quantity);//调拨入库数量
                    freight_month.setValue('custrecord_transfer_out_quantity22', data.transfer_out_quantity);//调拨出库数量
                    freight_month.setValue('custrecord_so_out_quantity22', data.so_out_quantity);//销售出库数量
                    freight_month.setValue('custrecord_inventory_profit22', data.inventory_profit);//盘盈数量
                    freight_month.setValue('custrecord_number_of_loss22', data.number_of_loss);//盘亏数量
                    freight_month.setValue('custrecord_scrap_quantity22', data.scrap_quantity);//报废数量
                    freight_month.setValue('custrecord_ending_inventory22', data.ending_inventory);//期末库存
                    freight_month.setValue('custrecord_start_amount33', start_amount);//期初金额
                    freight_month.setValue('custrecord_add_amount33', add_amount);//本期增加金额 
                    freight_month.setValue('custrecord_reduce_amount33', reduce_amount);//本期减少金额 
                    freight_month.setValue('custrecord_end_amount33', end_amount);//期末金额 = 期初金额+本期增加金额-本期减少金额 
                    freight_month.setValue('custrecord_to_price', to_price);//调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量） 
                    freight_month.setValue('custrecord_transfer_out_amount22', transfer_out_amount);//调拨出库金额=调拨出库数量*调拨单价 
                    var freight_month_id = freight_month.save();
                    if (freight_month_id) {
                        log.debug('success', '创建头程月末结转报表成功' + freight_month_id);
                        context.write('result', year + '-' + month);
                    }
                }
                // var freight_month = record.create({ type: 'customrecord_freight_quantity', isDynamic: true });
                // freight_month.setValue('custrecord_subsidary99', data.subsidiary);
                // freight_month.setValue('custrecord_year99', year);
                // freight_month.setValue('custrecord_month99', month);
                // freight_month.setValue('custrecord_location99', data.location);
                // freight_month.setValue('custrecord_item99', data.item);
                // freight_month.setValue('custrecord_start_quantity22', data.start_quantity);//期初库存
                // freight_month.setValue('custrecord_po_add_quantity22', data.po_add_quantity);//采购入库数量
                // freight_month.setValue('custrecord_transfer_into_quantity22', data.transfer_into_quantity);//调拨入库数量
                // freight_month.setValue('custrecord_transfer_out_quantity22', data.transfer_out_quantity);//调拨出库数量
                // freight_month.setValue('custrecord_so_out_quantity22', data.so_out_quantity);//销售出库数量
                // freight_month.setValue('custrecord_inventory_profit22', data.inventory_profit);//盘盈数量
                // freight_month.setValue('custrecord_number_of_loss22', data.number_of_loss);//盘亏数量
                // freight_month.setValue('custrecord_scrap_quantity22', data.scrap_quantity);//报废数量
                // freight_month.setValue('custrecord_ending_inventory22', data.ending_inventory);//期末库存
                // var freight_month_id = freight_month.save();
                // if (freight_month_id) {
                //     log.debug('success', '创建头程月末结转报表成功' + freight_month_id);
                //     context.write('result', year + '-' + month);
                // }
            }
        } catch (e) {
            log.debug('map e', e);
        }
    }

    //根据公司、地点、货品、科目为维度查询结果总表的期末剩余金额
    function getEndTermAmount(data, acc_arr) {
        var term_arr = [];
        var year = runtime.getCurrentScript().getParameter('custscript_need_year');
        var month = runtime.getCurrentScript().getParameter('custscript_need_month');
        if (month == 1) {
            month = 12;
            year = (year - 1).toFixed();
        } else {
            month = (month - 1).toFixed();
        }
        search.create({
            type: 'customrecord_freight_month',
            filters:
                [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_subsidary77', 'anyof', data.subsidiary],
                    'AND',
                    ['custrecord_year77', 'is', year],
                    'AND',
                    ['custrecord_month77', 'is', month],
                    'AND',
                    ['custrecord_account77', 'anyof', acc_arr],
                    'AND',
                    ['custrecord_location77', 'anyof', data.location],
                    'AND',
                    ['custrecord_item77', 'anyof', data.item],
                ],
            columns:
                [
                    'custrecord_subsidary77',
                    'custrecord_account77',
                    'custrecord_location77',
                    'custrecord_item77',
                    'custrecord_end_term_amount'
                ]
        }).run().each(function (result) {
            term_arr.push({
                subsidary: result.getValue(result.columns[0]),
                account: result.getValue(result.columns[1]),
                location: result.getValue(result.columns[2]),
                item: result.getValue(result.columns[3]),
                end_term_amount: result.getValue(result.columns[4])
            })
            return true;
        });
        return term_arr;
    }

    //获取金额
    function getMoney(data, month_data) {
        var filters_arr = [], start = 0;
        filters_arr.push(['posting', 'is', 'T']);
        filters_arr.push('AND');
        filters_arr.push(['trandate', 'within', month_data.startOfMonth, month_data.endOfMonth]);
        filters_arr.push('AND');
        filters_arr.push(['account', 'anyof', '571', '572', '573', '574', '575', '1469']); //测试环境 '1028', '1029', '1030', '1356', '1357'
        filters_arr.push('AND');
        filters_arr.push(['subsidiary', 'anyof', data.subsidiary]);
        filters_arr.push('AND');
        filters_arr.push(['location', 'anyof', data.location]);
        filters_arr.push('AND');
        filters_arr.push([['item', 'anyof', data.item], 'OR', ['custcol_journal_line_sku', 'anyof', data.item]]);
        var rec_data = [], rec_str = {}, acc_ids = [];
        var transaction_data = search.create({
            type: 'transaction',
            filters: filters_arr,
            columns:
                [
                    search.createColumn({
                        name: 'subsidiary',
                        label: '子公司'
                    }),
                    search.createColumn({
                        name: 'account',
                        label: '科目'
                    }),
                    search.createColumn({
                        name: 'location',
                        label: '地点'
                    }),
                    search.createColumn({
                        name: 'formulatext',
                        formula: "case when {type}='日记账' then {custcol_journal_line_sku} else {item} end",
                        label: '货品'
                    }),
                    search.createColumn({ name: 'netamount', label: '金额（净额）' })
                ]
        });
        var searchResultCount = transaction_data.runPaged().count;
        log.debug('transaction_data result count', searchResultCount);
        //获取当前汇率
        var ex_rate = getExchangeRate(month_data, data.subsidiary);
        log.debug('ex_rate', ex_rate);
        do {
            var results = transaction_data.run().getRange({
                start: start,
                end: start + 1000
            });
            log.debug('results', results);
            for (var i = 0; i < results.length; i++) {
                log.debug('金额（净额）', results[i].getValue(transaction_data.columns[4]));
                var debit_amount = 0, credit_amount = 0;
                if (Number(results[i].getValue(transaction_data.columns[4])) > 0) {
                    debit_amount = Number(results[i].getValue(transaction_data.columns[4])) / ex_rate;
                } else {
                    credit_amount = Number(results[i].getValue(transaction_data.columns[4])) / ex_rate;
                }
                if (acc_ids.indexOf(results[i].getValue(transaction_data.columns[1])) == -1) {
                    acc_ids.push(results[i].getValue(transaction_data.columns[1]));
                    rec_data.push({
                        subsidiary_id: results[i].getValue(transaction_data.columns[0]),
                        account_id: results[i].getValue(transaction_data.columns[1]),
                        location_id: results[i].getValue(transaction_data.columns[2]),
                        item_id: results[i].getValue(transaction_data.columns[3]),
                        debit_amount: debit_amount,
                        credit_amount: credit_amount
                    })
                } else {
                    for (var j = 0; j < rec_data.length; j++) {
                        if (rec_data[j].account_id == results[i].getValue(transaction_data.columns[1])) {
                            rec_data[j].debit_amount = Number(rec_data[j].debit_amount) + Number(debit_amount);
                            rec_data[j].credit_amount = Number(rec_data[j].credit_amount) + Number(credit_amount);
                        }
                    }
                }
            }
            start += 1000;
        } while (results.length > 0);
        rec_str.rec_data = rec_data;
        rec_str.acc_ids = acc_ids;
        return rec_str;
    }

    //获取当前汇率
    function getExchangeRate(month_data, sub_id) {
        var rate = 1;
        search.create({
            type: 'consolidatedexchangerate',
            filters:
                [
                    ['fromsubsidiary', 'anyof', sub_id],
                    'AND',
                    ['tosubsidiary', 'anyof', '1'],
                    'AND',
                    ['periodstartdate', 'within', month_data.startOfMonth, month_data.endOfMonth]
                ],
            columns:
                [
                    'currentrate'
                ]
        }).run().each(function (result) {
            rate = result.getValue(result.columns[0]);
            return false;
        });
        return rate;
    }

    //期初数量和期末数量
    function getOtherQuantity(data) {
        var year = runtime.getCurrentScript().getParameter('custscript_need_year');
        var month = runtime.getCurrentScript().getParameter('custscript_need_month');
        if (month == 1) {
            month = 12;
            year = (year - 1).toFixed();
        } else {
            month = (month - 1).toFixed();
        }
        log.debug('查询上一级year', year);
        log.debug('查询上一级month', month);
        log.debug('search data', data);
        log.debug('subsidiary', data.subsidiary);
        log.debug('location', data.location);
        log.debug('item', data.item);
        var ending_inventory = 0;
        search.create({
            type: 'customrecord_freight_quantity',
            filters:
                [
                    ['isinactive', 'is', 'false'],
                    'AND',
                    ['custrecord_subsidary99', 'anyof', data.subsidiary],
                    'AND',
                    ['custrecord_year99', 'is', [year]],
                    'AND',
                    ['custrecord_month99', 'is', [month]],
                    'AND',
                    ['custrecord_location99', 'anyof', data.location],
                    'AND',
                    ['custrecord_item99', 'anyof', data.item],
                ],
            columns:
                [
                    'custrecord_ending_inventory22'
                ]
        }).run().each(function (result) {
            log.debug('1111', result.getValue(result.columns[0]));
            ending_inventory = result.getValue(result.columns[0]);
            return false;
        });
        data.start_quantity = ending_inventory;
        //期末库存 = 期初库存+采购入库数量+调拨入库数量+调拨出库数量+销售出库数量+盘盈数量+盘亏数量+报废毁损数量
        data.ending_inventory = Number(ending_inventory) + Number(data.po_add_quantity) + Number(data.transfer_into_quantity) + Number(data.transfer_out_quantity) +
            Number(data.so_out_quantity) + Number(data.inventory_profit) + Number(data.number_of_loss) + Number(data.scrap_quantity);
        return data;
    }

    function reduce(context) {
        var data_arr = context.values;
        log.debug('data_arr', data_arr);
        //创建金额计算脚本运用
        var t = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_cl_mp_first_pass_amount',
            deploymentId: 'customdeploy_cl_mp_first_pass_amount',
            params: { custscript_need_info: JSON.stringify(data_arr[0]) }
        });
        t.submit();
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
