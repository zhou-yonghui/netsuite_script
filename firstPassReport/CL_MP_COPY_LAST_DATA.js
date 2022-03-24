/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *复制上月未处理数据到当前月份
 */
define(['N/runtime', 'N/search', 'N/record', '../utils/moment'], function (runtime, search, record, moment) {

    function getInputData() {
        try {
            var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info1'));
            if (data) {
                var search_data = data.split('-');
                var need_arr = getDataList(search_data);
                log.debug('need_arr', need_arr);
                log.debug('need_arr', need_arr.length);
                return
                return need_arr;
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    //获取上月期末剩余金额、期末库存不为0的数据
    function getDataList(search_data) {
        var year = search_data[0];
        var month = search_data[1];
        if (month == 1) {
            month = 12;
            year = (year - 1).toFixed();
        } else {
            month = (month - 1).toFixed();
        }
        log.debug('year', year);
        log.debug('month', month);
        var start = 0, data = [];
        var freight_month = search.create({
            type: 'customrecord_freight_month',
            filters: [
                ['isinactive', 'is', 'false'],
                'and',
                ['custrecord_year77', 'is', [year]],
                'and',
                ['custrecord_month77', 'is', [month]],
                'and',
                [
                    [
                        ['custrecord_end_term_amount', 'isnotempty', ''],
                        'and',
                        ['custrecord_end_term_amount', 'notequalto', '0.00']
                    ],
                    'or',
                    [
                        ['custrecord_ending_inventory', 'isnotempty', ''],
                        'and',
                        ['custrecord_ending_inventory', 'notequalto', '0']
                    ]
                ],
                // 'and',
                // ['custrecord_item77', 'anyof', [436]]
            ],
            columns: [
                'custrecord_subsidary77',
                'custrecord_year77',
                'custrecord_month77',
                'custrecord_account77',
                'custrecord_location77',
                'custrecord_item77',
                'custrecord_ending_inventory',
                'custrecord_end_term_amount'
            ]
        });
        var freight_month_count = freight_month.runPaged().count;
        log.debug('freight_month result count', freight_month_count);
        do {
            var results = freight_month.run().getRange({
                start: start,
                end: start + 1000
            });
            for (var i = 0; i < results.length; i++) {
                data.push({
                    subsidary: results[i].getValue(freight_month.columns[0]),
                    year: results[i].getValue(freight_month.columns[1]),
                    month: results[i].getValue(freight_month.columns[2]),
                    account: results[i].getValue(freight_month.columns[3]),
                    location: results[i].getValue(freight_month.columns[4]),
                    item: results[i].getValue(freight_month.columns[5]),
                    ending_inventory: results[i].getValue(freight_month.columns[6]),
                    end_term_amount: results[i].getValue(freight_month.columns[7])
                })
            }
            start += 1000;
        } while (results.length > 0);
        return data;
    }

    function map(context) {
        try {
            var time = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info1'));
            var data = JSON.parse(context.value);
            var search_time = time.split('-');
            var month_data = getMonthData(search_time);
            var rec_data = getMoney(data, month_data);
            //本期增加金额
            var add_amount = rec_data.debit_amount;
            //本期减少金额
            var reduce_amount = rec_data.credit_amount;
            //期末金额 = 期初金额+本期增加金额+本期减少金额
            var end_amount = (Number(data.end_term_amount) + Number(add_amount) + Number(reduce_amount)).toFixed(2);
            //调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量）
            var divisor_num = Number(data.ending_inventory);
            var to_price = 0;
            if (divisor_num && divisor_num != 0) {
                to_price = (Number(end_amount) / Number(divisor_num)).toFixed(2);
            }
            //调拨出库金额=调拨出库数量*调拨单价 
            var transfer_out_amount = 0;
            var money_data = getNeedData(data, month_data, end_amount, transfer_out_amount);
            //根据对应的公司、年份、月份、科目、地点、货品查找当前月份是否有记录没有进行添加
            var freight_month_id;
            search.create({
                type: 'customrecord_freight_month',
                filters: [
                    ['isinactive', 'is', 'F'],
                    'and',
                    ['custrecord_year77', 'is', search_time[0]],
                    'and',
                    ['custrecord_month77', 'is', search_time[1]],
                    'and',
                    ['custrecord_subsidary77', 'is', data.subsidary],
                    'and',
                    ['custrecord_account77', 'is', data.account],
                    'and',
                    ['custrecord_location77', 'is', data.location],
                    'and',
                    ['custrecord_item77', 'is', data.item],
                ]
            }).run().each(function (result) {
                freight_month_id = result.id;
                return false;
            });
            if (!freight_month_id) {
                //如果没有freight_month_id，进行数据添加
                var freight_month = record.create({ type: 'customrecord_freight_month', isDynamic: true });
                freight_month.setValue('custrecord_subsidary77', data.subsidary);
                freight_month.setValue('custrecord_year77', search_time[0]);
                freight_month.setValue('custrecord_month77', search_time[1]);
                freight_month.setValue('custrecord_account77', data.account);
                freight_month.setValue('custrecord_location77', data.location);
                freight_month.setValue('custrecord_item77', data.item);
                freight_month.setValue('custrecord_start_amount', data.end_term_amount);//期初金额
                freight_month.setValue('custrecord_end_amount', data.end_term_amount);//期末金额
                freight_month.setValue('custrecord_end_term_amount', data.end_term_amount);//期末剩余金额
                freight_month.setValue('custrecord_start_quantity', data.ending_inventory);//期初库存
                freight_month.setValue('custrecord_ending_inventory', data.ending_inventory);//期末库存
                freight_month.setValue('custrecord_ransfer_into_amount', money_data.ransfer_into_amount);
                freight_month.setValue('custrecord_salse_price', money_data.salse_price);
                freight_month.setValue('custrecord_end_term_amount', money_data.end_term_amount);
                freight_month.setValue('custrecord_add_amount', add_amount);//本期增加金额 
                freight_month.setValue('custrecord_reduce_amount', reduce_amount);//本期减少金额 
                freight_month.setValue('custrecord_end_amount', end_amount);//期末金额 = 期初金额+本期增加金额-本期减少金额 
                freight_month.setValue('custrecord_transfer_unit_price', to_price);//调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量） 
                freight_month.setValue('custrecord_transfer_out_quantity', transfer_out_amount);//调拨出库金额=调拨出库数量*调拨单价
                var month_data_id = freight_month.save();
                if (month_data_id) {
                    log.debug('结果表添加成功', month_data_id);
                }
            }
            var freight_quantity_id;
            search.create({
                type: 'customrecord_freight_quantity',
                filters: [
                    ['isinactive', 'is', 'F'],
                    'and',
                    ['custrecord_year99', 'is', search_time[0]],
                    'and',
                    ['custrecord_month99', 'is', search_time[1]],
                    'and',
                    ['custrecord_subsidary99', 'is', data.subsidary],
                    'and',
                    ['custrecord_account99', 'is', data.account],
                    'and',
                    ['custrecord_location99', 'is', data.location],
                    'and',
                    ['custrecord_item99', 'is', data.item],
                ]
            }).run().each(function (result) {
                freight_quantity_id = result.id;
                return false;
            });
            if (!freight_quantity_id) {
                //如果没有freight_quantity_id，进行数据添加
                var freight_quantity = record.create({ type: 'customrecord_freight_quantity', isDynamic: true });
                freight_quantity.setValue('custrecord_subsidary99', data.subsidary);
                freight_quantity.setValue('custrecord_year99', search_time[0]);
                freight_quantity.setValue('custrecord_month99', search_time[1]);
                freight_quantity.setValue('custrecord_account99', data.account);
                freight_quantity.setValue('custrecord_location99', data.location);
                freight_quantity.setValue('custrecord_item99', data.item);
                freight_quantity.setValue('custrecord_start_amount33', data.end_term_amount);//期初金额
                freight_quantity.setValue('custrecord_start_quantity22', data.ending_inventory);//期初库存
                freight_quantity.setValue('custrecord_ending_inventory22', data.ending_inventory);//期末库存
                freight_quantity.setValue('custrecord_add_amount33', add_amount);//本期增加金额 
                freight_quantity.setValue('custrecord_reduce_amount33', reduce_amount);//本期减少金额 
                freight_quantity.setValue('custrecord_end_amount33', end_amount);//期末金额 = 期初金额+本期增加金额-本期减少金额 
                freight_quantity.setValue('custrecord_to_price', to_price);//调拨单价=期末金额/（期初库存+采购入库数量+调拨入库数量） 
                freight_quantity.setValue('custrecord_transfer_out_amount22', transfer_out_amount);//调拨出库金额=调拨出库数量*调拨单价 
                var quantity_data_id = freight_quantity.save();
                if (quantity_data_id) {
                    log.debug('结果表添加成功', quantity_data_id);
                }
            }
        } catch (e) {
            log.debug('e', e);
        }
    }

    //获取金额
    function getMoney(data, month_data) {
        var filters_arr = [], start = 0;
        filters_arr.push(['posting', 'is', 'T']);
        filters_arr.push('AND');
        filters_arr.push(['trandate', 'within', month_data.startOfMonth, month_data.endOfMonth]);
        filters_arr.push('AND');
        filters_arr.push(['account', 'anyof', data.account]); //测试环境 '1028', '1029', '1030', '1356', '1357'
        filters_arr.push('AND');
        filters_arr.push(['subsidiary', 'anyof', data.subsidary]);
        filters_arr.push('AND');
        filters_arr.push(['location', 'anyof', data.location]);
        filters_arr.push('AND');
        filters_arr.push([['item', 'anyof', data.item], 'OR', ['custcol_journal_line_sku', 'anyof', data.item]]);
        var rec_data = {};
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
        var ex_rate = getExchangeRate(month_data, data.subsidary);
        log.debug('ex_rate', ex_rate);
        var debit_amount = 0, credit_amount = 0;
        do {
            var results = transaction_data.run().getRange({
                start: start,
                end: start + 1000
            });
            log.debug('results', results);
            for (var i = 0; i < results.length; i++) {
                log.debug('金额（净额）', results[i].getValue(transaction_data.columns[4]));
                var need_debit_amount = 0, need_credit_amount = 0;
                if (Number(results[i].getValue(transaction_data.columns[4])) > 0) {
                    need_debit_amount = Number(results[i].getValue(transaction_data.columns[4])) / ex_rate;
                } else {
                    need_credit_amount = Number(results[i].getValue(transaction_data.columns[4])) / ex_rate;
                }
                debit_amount = Number(need_debit_amount) + Number(debit_amount);
                credit_amount = Number(need_credit_amount) + Number(credit_amount);
            }
            start += 1000;
        } while (results.length > 0);
        rec_data.debit_amount = debit_amount;
        rec_data.credit_amount = credit_amount;
        return rec_data;
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

    //获取月初月末日期
    function getMonthData(search_time) {
        var year = search_time[0];
        var month = search_time[1];
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

    //根据公司、地点、货品查询数量表中的数据
    function getNeedData(data, month_data, end_amount, transfer_out_amount) {
        var need_data = {};
        var rec_list = [], start = 0, start_loc_arr = [];
        if (data.item) {
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
                        ["subsidiary", "anyof", data.subsidary],
                        "AND",
                        ["item", "anyof", data.item],
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
                        if (start_location && target_location && target_location == data.location) {
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
            salse_price = 0;//销售单价
        //所有记录的调拨单价
        var price_arr = getLocPrice(start_loc_arr, data.account, data.item);
        log.debug('price_arr', price_arr);
        //根据查询出来的调拨单价，依据公司、起始地点、货品
        if (price_arr.length > 0) {
            for (var i = 0; i < rec_list.length; i++) {
                for (var j = 0; j < price_arr.length; j++) {
                    if (rec_list[i].sub_id == price_arr[j].sub_id && rec_list[i].start_location == price_arr[j].loc_id && rec_list[i].item_id == price_arr[j].item_id && data.account == price_arr[j].acc_id) {
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
        var divisor_num = Number(data.ending_inventory);
        log.debug('divisor_num', divisor_num);
        if (divisor_num != 0) {
            salse_price = ((Number(end_amount) + Number(ransfer_into_amount) + Number(transfer_out_amount)) / Number(divisor_num)).toFixed(2);
        }
        //期末剩余金额=期末金额+调拨入库金额+调拨出库金额+盘盈金额+盘亏金额+销售结转金额+报废金额
        var end_term_amount = (Number(end_amount) + Number(ransfer_into_amount) + Number(transfer_out_amount)).toFixed(2);
        need_data.ransfer_into_amount = ransfer_into_amount;
        need_data.salse_price = salse_price;
        need_data.end_term_amount = end_term_amount;
        return need_data;
    }

    //所有记录的调拨单价
    function getLocPrice(start_loc_arr, acc_id, item_id) {
        var rec_arr = [], floge = [], start = 0, filters_arr = [];
        var data = JSON.parse(runtime.getCurrentScript().getParameter('custscript_need_info1'));
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

    function reduce(context) {

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
