/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *金额处理
 */
 define(['N/runtime', 'N/search', 'N/record', '../utils/moment', 'N/task'], function (runtime, search, record, moment, task) {

    function getInputData() {
        try {
            var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
            if (data) {
                var search_data = data.split('-');
                var need_arr = getDataList(search_data);
                log.debug('need_arr', need_arr);
                log.debug('need_arr', need_arr.length);
                return need_arr;
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    //获取头程金额
    function getDataList(search_data) {
        var start = 0, data = [];
        var freight_quantity = search.create({
            type: 'customrecord_freight_quantity',
            filters: [
                ['isinactive', 'is', 'F'],
                'and',
                ['custrecord_year99', 'is', search_data[0]],
                'and',
                ['custrecord_month99', 'is', search_data[1]]
            ],
            columns: [
                'custrecord_transfer_into_quantity22',
                'custrecord_end_amount33',
                'custrecord_transfer_out_amount22',
                'custrecord_start_quantity22',
                'custrecord_po_add_quantity22',
                'custrecord_transfer_out_quantity22',
                'custrecord_inventory_profit22',
                'custrecord_number_of_loss22',
                'custrecord_scrap_quantity22',
                'custrecord_so_out_quantity22',
                'custrecord_subsidary99',
                'custrecord_item99',
                'custrecord_location99',
                'custrecord_account99',
                'custrecord_start_amount33',
                'custrecord_add_amount33',
                'custrecord_reduce_amount33',
                'custrecord_to_price',
                'custrecord_ending_inventory22'
            ]
        });
        var freight_quantity_count = freight_quantity.runPaged().count;
        log.debug('freight_quantity result count', freight_quantity_count);
        do {
            var results = freight_quantity.run().getRange({
                start: start,
                end: start + 1000
            });
            for (var i = 0; i < results.length; i++) {
                data.push({
                    bill_id: results[i].id,
                    transfer_into_quantity: results[i].getValue(freight_quantity.columns[0]) ? results[i].getValue(freight_quantity.columns[0]) : 0,
                    end_amount: results[i].getValue(freight_quantity.columns[1]) ? results[i].getValue(freight_quantity.columns[1]) : 0,
                    transfer_out_amount: results[i].getValue(freight_quantity.columns[2]) ? results[i].getValue(freight_quantity.columns[2]) : 0,
                    start_quantity: results[i].getValue(freight_quantity.columns[3]) ? results[i].getValue(freight_quantity.columns[3]) : 0,
                    po_add_quantity: results[i].getValue(freight_quantity.columns[4]) ? results[i].getValue(freight_quantity.columns[4]) : 0,
                    transfer_out_quantity: results[i].getValue(freight_quantity.columns[5]) ? results[i].getValue(freight_quantity.columns[5]) : 0,
                    inventory_profit: results[i].getValue(freight_quantity.columns[6]) ? results[i].getValue(freight_quantity.columns[6]) : 0,
                    number_of_loss: results[i].getValue(freight_quantity.columns[7]) ? results[i].getValue(freight_quantity.columns[7]) : 0,
                    scrap_quantity: results[i].getValue(freight_quantity.columns[8]) ? results[i].getValue(freight_quantity.columns[8]) : 0,
                    so_out_quantity: results[i].getValue(freight_quantity.columns[9]) ? results[i].getValue(freight_quantity.columns[9]) : 0,
                    sub_id: results[i].getValue(freight_quantity.columns[10]) ? results[i].getValue(freight_quantity.columns[10]) : '',
                    item_id: results[i].getValue(freight_quantity.columns[11]) ? results[i].getValue(freight_quantity.columns[11]) : '',
                    loc_id: results[i].getValue(freight_quantity.columns[12]) ? results[i].getValue(freight_quantity.columns[12]) : '',
                    acc_id: results[i].getValue(freight_quantity.columns[13]) ? results[i].getValue(freight_quantity.columns[13]) : '',
                    start_amount: results[i].getValue(freight_quantity.columns[14]) ? results[i].getValue(freight_quantity.columns[14]) : 0,
                    add_amount: results[i].getValue(freight_quantity.columns[15]) ? results[i].getValue(freight_quantity.columns[15]) : 0,
                    reduce_amount: results[i].getValue(freight_quantity.columns[16]) ? results[i].getValue(freight_quantity.columns[16]) : 0,
                    transfer_unit_price: results[i].getValue(freight_quantity.columns[17]) ? results[i].getValue(freight_quantity.columns[17]) : 0,
                    ending_inventory: results[i].getValue(freight_quantity.columns[18]) ? results[i].getValue(freight_quantity.columns[18]) : 0,
                })
            }
            start += 1000;
        } while (results.length > 0);
        return data;
    }

    function map(context) {
        try {
            var data = JSON.parse(context.value);
            log.debug('data start', data);
            var month_data = getMonthData();
            data = getNeedData(data, month_data, data.sub_id, data.item_id, data.loc_id, data.acc_id);
            log.debug('data end', data);
            var need_info = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
            var search_data = need_info.split('-');
            var freight_month = record.create({ type: 'customrecord_freight_month', isDynamic: true });
            freight_month.setValue('custrecord_subsidary77', data.sub_id);
            freight_month.setValue('custrecord_year77', search_data[0]);
            freight_month.setValue('custrecord_month77', search_data[1]);
            freight_month.setValue('custrecord_account77', data.acc_id);
            freight_month.setValue('custrecord_location77', data.loc_id);
            freight_month.setValue('custrecord_item77', data.item_id);
            freight_month.setValue('custrecord_start_amount', data.start_amount);
            freight_month.setValue('custrecord_add_amount', data.add_amount);
            freight_month.setValue('custrecord_reduce_amount', data.reduce_amount);
            freight_month.setValue('custrecord_end_amount', data.end_amount);
            freight_month.setValue('custrecord_transfer_unit_price', data.transfer_unit_price);
            freight_month.setValue('custrecord_start_quantity', data.start_quantity);
            freight_month.setValue('custrecord_po_add_quantity', data.po_add_quantity);
            freight_month.setValue('custrecord_transfer_into_quantity', data.transfer_into_quantity);
            freight_month.setValue('custrecord_transfer_out_quantity', data.transfer_out_quantity);
            freight_month.setValue('custrecord_so_out_quantity', data.so_out_quantity);
            freight_month.setValue('custrecord_inventory_profit', data.inventory_profit);
            freight_month.setValue('custrecord_number_of_loss', data.number_of_loss);
            freight_month.setValue('custrecord_scrap_quantity', data.scrap_quantity);
            freight_month.setValue('custrecord_ending_inventory', data.ending_inventory);
            freight_month.setValue('custrecord_ransfer_into_amount', data.ransfer_into_amount);
            freight_month.setValue('custrecord_transfer_out_amount', data.transfer_out_amount);
            freight_month.setValue('custrecord_salse_price', data.salse_price);
            freight_month.setValue('custrecord_profit_amount', data.profit_amount);
            freight_month.setValue('custrecord_loss_amount', data.loss_amount);
            freight_month.setValue('custrecord_scrap_amount', data.scrap_amount);
            freight_month.setValue('custrecord_carry_over_amount', data.carry_over_amount);
            freight_month.setValue('custrecord_end_term_amount', data.end_term_amount);
            var freight_month_id = freight_month.save();
            if (freight_month_id) {
                log.debug('金额处理成功', freight_month_id);
                //创建日记账   
                var journal_id = createJournal(data, freight_month_id);
                if (journal_id) {
                    log.debug('success', '创建日记账成功' + journal_id);
                    record.submitFields({
                        type: 'customrecord_freight_month',
                        id: freight_month_id,
                        values: {
                            custrecord_journal_monthly: journal_id
                        }
                    });
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
        context.write('result', 1);
    }

    //创建日记账
    function createJournal(rec_data, freight_month_id) {
        var result_arr = [], total_debit = 0, journal_id;
        if (rec_data.profit_amount && rec_data.profit_amount != 0) {
            result_arr.push({
                acc_id: 693, //测试环境 1366
                amount: rec_data.profit_amount
            })
            total_debit = Number(total_debit) + Number(rec_data.profit_amount);
        }
        if (rec_data.loss_amount && rec_data.loss_amount != 0) {
            result_arr.push({
                acc_id: 693, //测试环境 1366
                amount: rec_data.loss_amount
            })
            total_debit = Number(total_debit) + Number(rec_data.loss_amount);
        }
        if (rec_data.scrap_amount && rec_data.scrap_amount != 0) {
            result_arr.push({
                acc_id: 688, //测试环境 1368
                amount: rec_data.scrap_amount
            })
            total_debit = Number(total_debit) + Number(rec_data.scrap_amount);
        }
        if (rec_data.carry_over_amount && rec_data.carry_over_amount != 0) {
            result_arr.push({
                acc_id: 634, //测试环境 528
                amount: rec_data.carry_over_amount
            })
            total_debit = Number(total_debit) + Number(rec_data.carry_over_amount);
        }
        log.debug('result_arr', result_arr);
        log.debug('total_debit', total_debit);
        if (result_arr.length > 0 && total_debit != 0) {
            var journal = record.create({ type: 'journalentry' });
            journal.setValue('subsidiary', rec_data.sub_id);
            var sub_data = search.lookupFields({ type: 'subsidiary', id: rec_data.sub_id, columns: ['currency'] });
            var currency_id = sub_data.currency[0].value;
            journal.setValue('currency', currency_id);
            var need_info = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
            var search_data = need_info.split('-');
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var monthSelected = moment(search_data[0] + search_data[1], 'YYYYMM');
            var endOfMonthObject = moment(monthSelected);
            endOfMonthObject.endOf('month');
            endOfMonth = endOfMonthObject.format(dateFormat);
            log.debug('endOfMonth', endOfMonth)
            journal.setText('trandate', endOfMonth);
            journal.setValue('memo', '物流费用月末结转成本日记账');
            journal.setValue('approvalstatus', 2);
            journal.setValue('custbody_comefrom_carry', freight_month_id);
            for (var i = 0; i <= result_arr.length; i++) {
                if (i != result_arr.length) {
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: result_arr[i].acc_id, line: i });//贷方科目
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'credit', value: result_arr[i].amount, line: i });//贷方金额
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'custcol_journal_line_sku', value: rec_data.item_id, line: i });
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'location', value: rec_data.loc_id, line: i });
                } else {
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'account', value: rec_data.acc_id, line: i });//借方科目
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'debit', value: (total_debit).toFixed(2), line: i });//借方金额
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'custcol_journal_line_sku', value: rec_data.item_id, line: i });
                    journal.setSublistValue({ sublistId: 'line', fieldId: 'location', value: rec_data.loc_id, line: i });
                }
            }
            journal_id = journal.save({ ignoreMandatoryFields: true });
        }
        return journal_id;
    }

    //根据公司、地点、货品查询数量表中的数据
    function getNeedData(data, month_data, sub_id, item_id, loc_id, acc_id) {
        var rec_list = [], start = 0, start_loc_arr = [];
        if (item_id) {
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        [
                            [
                                ["type", "anyof", "ItemShip"], "AND", ["account.localizednumber", "startswith", "1405"],
                                "AND",
                                ["createdfrom.type", "anyof", "TrnfrOrd"]
                            ],
                            "OR",
                            [
                                ["type", "anyof", "InvTrnfr"], "AND", ["account.localizednumber", "startswith", "1405"]
                            ]
                        ],
                        "AND",
                        ["subsidiary", "anyof", sub_id],
                        "AND",
                        ["item", "anyof", item_id],
                        "AND",
                        ["trandate", "within", month_data.startOfMonth, month_data.endOfMonth]
                    ],
                columns:
                    [
                        search.createColumn({ name: "subsidiarynohierarchy", label: "子公司(无层级)" }),
                        search.createColumn({
                            name: "trandate",
                            sort: search.Sort.ASC,
                            label: "日期"
                        }),
                        search.createColumn({ name: "type", label: "类型" }),
                        search.createColumn({
                            name: "tranid",
                            sort: search.Sort.ASC,
                            label: "文件号码"
                        }),
                        search.createColumn({
                            name: "type",
                            join: "createdFrom",
                            label: "创建自类型"
                        }),
                        search.createColumn({ name: "createdfrom", label: "创建自" }),
                        search.createColumn({ name: "item", label: "货品" }),
                        search.createColumn({ name: "quantity", label: "数量" }),
                        search.createColumn({ name: "custbody_start_location_it", label: "起始地点" }),
                        search.createColumn({ name: "custbody_target_location_it", label: "目的地点" }),
                        search.createColumn({ name: "location", label: "地点" }),
                        search.createColumn({ name: "transferlocation", label: "收货地点" })
                    ]
            });
            var searchResultCount = transactionSearchObj.runPaged().count;
            log.debug("transactionSearchObj result count", searchResultCount);
            do {
                var results = transactionSearchObj.run().getRange({
                    start: start,
                    end: start + 1000
                });
                for (var i = 0; i < results.length; i++) {
                    if (Number(results[i].getValue(transactionSearchObj.columns[7])) < 0) {
                        var start_location, target_location;
                        if (results[i].getValue(transactionSearchObj.columns[2]) == 'InvTrnfr') {
                            start_location = results[i].getValue(transactionSearchObj.columns[8]);
                            target_location = results[i].getValue(transactionSearchObj.columns[9]);
                        } else if (results[i].getValue(transactionSearchObj.columns[2]) == 'ItemShip') {
                            start_location = results[i].getValue(transactionSearchObj.columns[10]);
                            target_location = results[i].getValue(transactionSearchObj.columns[11]);
                        }
                        if (start_location && target_location && target_location == loc_id) {
                            rec_list.push({
                                sub_id: results[i].getValue(transactionSearchObj.columns[0]) ? results[i].getValue(transactionSearchObj.columns[0]) : '',
                                item_id: results[i].getValue(transactionSearchObj.columns[6]) ? results[i].getValue(transactionSearchObj.columns[6]) : '',
                                start_location: start_location,
                                target_location: target_location,
                                quantity: results[i].getValue(transactionSearchObj.columns[7]) ? results[i].getValue(transactionSearchObj.columns[7]) : '',
                                bill_type: results[i].getValue(transactionSearchObj.columns[2]) ? results[i].getValue(transactionSearchObj.columns[2]) : ''
                            })
                            if (start_loc_arr.indexOf(start_location) == -1) {
                                start_loc_arr.push(start_location);
                            }
                        }
                    }
                }
                start += 1000;
            } while (results.length > 0);
        }
        log.debug('rec_list', rec_list);
        var ransfer_into_amount = 0,//调拨入库金额
            salse_price = 0,//销售单价
            profit_amount = 0,//盘盈金额
            loss_amount = 0,//盘亏金额
            scrap_amount = 0,//报废金额
            carry_over_amount = 0;//销售结转金额
        //所有记录的调拨单价
        var price_arr = getLocPrice(start_loc_arr, acc_id, item_id);
        log.debug('price_arr', price_arr);
        //根据查询出来的调拨单价，依据公司、起始地点、货品
        if (price_arr.length > 0) {
            for (var i = 0; i < rec_list.length; i++) {
                for (var j = 0; j < price_arr.length; j++) {
                    if (rec_list[i].sub_id == price_arr[j].sub_id && rec_list[i].start_location == price_arr[j].loc_id && rec_list[i].item_id == price_arr[j].item_id && acc_id == price_arr[j].acc_id) {
                        log.debug('ransfer_into_amount', ransfer_into_amount);
                        log.debug('rec_list[i].quantity', rec_list[i].quantity);
                        log.debug('price_arr[j].transfer_unit_price', price_arr[j].transfer_unit_price);
                        //调拨入库金额 = 调出仓库的调拨单价*调拨入库数量
                        ransfer_into_amount = Number(ransfer_into_amount) + Math.abs(Number(rec_list[i].quantity) * Number(price_arr[j].transfer_unit_price));
                        log.debug('ransfer_into_amount', ransfer_into_amount);
                    }
                }
            }
        }
        //销售单价 = （期末金额+调拨入库金额+调拨出库金额）/(期初库存+采购入库数量+调拨入库数量）
        log.debug('data.start_quantity', data.start_quantity);
        log.debug('data.po_add_quantity', data.po_add_quantity);
        log.debug('data.transfer_into_quantity', data.transfer_into_quantity);
        log.debug('data.end_amount', data.end_amount);
        log.debug('ransfer_into_amount', ransfer_into_amount);
        log.debug('data.transfer_out_amount', data.transfer_out_amount);
        var divisor_num = Number(data.start_quantity) + Number(data.po_add_quantity) + Number(data.transfer_into_quantity);
        log.debug('divisor_num', divisor_num);
        if (divisor_num != 0) {
            salse_price = ((Number(data.end_amount) + Number(ransfer_into_amount) + Number(data.transfer_out_amount)) / Number(divisor_num)).toFixed(2);
        }
        //对应数量乘以销售单价
        if (salse_price != 0) {
            profit_amount = (Number(data.inventory_profit) * Number(salse_price)).toFixed(2);
            loss_amount = (Number(data.number_of_loss) * Number(salse_price)).toFixed(2);
            scrap_amount = (Number(data.scrap_quantity) * Number(salse_price)).toFixed(2);
            carry_over_amount = (Number(data.so_out_quantity) * Number(salse_price)).toFixed(2);
        }
        //期末剩余金额=期末金额+调拨入库金额+调拨出库金额+盘盈金额+盘亏金额+销售结转金额+报废金额
        var end_term_amount = (Number(data.end_amount) + Number(ransfer_into_amount) + Number(data.transfer_out_amount) + Number(profit_amount) + Number(loss_amount) + Number(carry_over_amount) + Number(scrap_amount)).toFixed(2);
        data.ransfer_into_amount = ransfer_into_amount;
        data.salse_price = salse_price;
        data.profit_amount = profit_amount;
        data.loss_amount = loss_amount;
        data.scrap_amount = scrap_amount;
        data.carry_over_amount = carry_over_amount;
        data.end_term_amount = end_term_amount;
        return data;
    }

    //所有记录的调拨单价
    function getLocPrice(start_loc_arr, acc_id, item_id) {
        var rec_arr = [], floge = [], start = 0, filters_arr = [];
        var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
        var search_data = data.split('-');
        filters_arr.push(['isinactive', 'is', 'F']);
        filters_arr.push('AND');
        filters_arr.push(['custrecord_year99', 'is', search_data[0]]);
        filters_arr.push('AND');
        filters_arr.push(['custrecord_month99', 'is', search_data[1]]);
        filters_arr.push('AND');
        filters_arr.push(['custrecord_account99', 'anyof', acc_id]);
        filters_arr.push('AND');
        filters_arr.push(['custrecord_item99', 'anyof', item_id]);
        if (start_loc_arr.length > 0) {
            filters_arr.push('AND');
            filters_arr.push(['custrecord_location99', 'anyof', start_loc_arr]);
        }
        var freight_month = search.create({
            type: 'customrecord_freight_quantity',
            filters: filters_arr,
            columns:
                [
                    'custrecord_subsidary99',//公司
                    'custrecord_item99',//货品
                    'custrecord_location99',//仓库
                    'custrecord_to_price',//调拨单价
                    'custrecord_account99'//科目
                ]
        });
        var searchResultCount = freight_month.runPaged().count;
        log.debug('searchResultCount', searchResultCount);
        do {
            var results = freight_month.run().getRange({
                start: start,
                end: start + 1000
            });
            for (var i = 0; i < results.length; i++) {
                // if (floge.indexOf(results[i].getValue(freight_month.columns[0]) + results[i].getValue(freight_month.columns[1]) + results[i].getValue(freight_month.columns[2])) == -1) {

                //     floge.push(results[i].getValue(freight_month.columns[0]) + results[i].getValue(freight_month.columns[1]) + results[i].getValue(freight_month.columns[2]));
                // }
                rec_arr.push({
                    sub_id: results[i].getValue(freight_month.columns[0]) ? results[i].getValue(freight_month.columns[0]) : '',
                    item_id: results[i].getValue(freight_month.columns[1]) ? results[i].getValue(freight_month.columns[1]) : '',
                    loc_id: results[i].getValue(freight_month.columns[2]) ? results[i].getValue(freight_month.columns[2]) : '',
                    transfer_unit_price: results[i].getValue(freight_month.columns[3]) ? results[i].getValue(freight_month.columns[3]) : '',
                    acc_id: results[i].getValue(freight_month.columns[4]) ? results[i].getValue(freight_month.columns[4]) : ''
                })
            }
            start += 1000;
        } while (results.length > 0);
        return rec_arr;
    }

    //获取月初月末日期
    function getMonthData() {
        var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
        var search_data = data.split('-');
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var monthSelected = moment(search_data[0] + search_data[1], 'YYYYMM');
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

    function reduce(context) {
        //将上月没有处理的数据复制到当前的月份
        var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info'));
        var t1 = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_cl_mp_copy_last_data',
            deploymentId: 'customdeploy_cl_mp_copy_last_data',
            params: { custscript_need_info1: JSON.stringify(data) }
        });
        t1.submit();
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
