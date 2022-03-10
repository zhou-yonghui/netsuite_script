/**
 * 每日获取中国人民银行实时汇率
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
 define(
    ['N/search', 'N/record', 'N/task','N/file','N/runtime','N/format','N/http'],
    function(search, record, task,file,runtime,format,http) {
        function getInputData() {
            var headers = {
                "Accept": "application/json,text/javascript,*/*;q=0.01", 
                "Accept-Encoding": "gzip,deflate",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
            };
            var body = {
                "startDate": 2021-11-26,  // 参考格式： 2021-12-01
                "endDate": 2021-12-10,  // 参考格式： 2021-12-16
                "currency": "AUD/CNY,CAD/CNY,CHF/CNY,EUR/CNY,GBP/CNY,HKD/CNY,CNY/RUB,SGD/CNY,USD/CNY,100JPY/CNY,CNY/MXN,DKK/CNY",
                "pageSize": 15 // 展示数量
            };            
            var response = http.get({      //用get去请求外部数据
                url:'http://www.chinamoney.com.cn/ags/ms/cm-u-bk-ccpr/CcprHisNew',             //TODO：中国人民银行汇率接口
                body:body,
                headers:headers,
            });
            // log.debug('response.body',JSON.stringify(response.body));
            log.debug('response.body',response.body);
            //创建实时汇率表
            var exchange_data = getExchangeRate(response.body);
            log.debug('exchange_data',exchange_data);
            var create_flag = getOnly();
            log.debug('create_flag',create_flag);
            if(create_flag == 'Y'){
                for(var i = 0;i < exchange_data.list.length;i++){
                    var cur_flag = 'one';
                    //获取币种文本对应的ns内部id
                    var long_text = exchange_data.list[i][0];
                    var cur_text = long_text.split('/');
                    var cur_t;
                    if(cur_text[0] != 'CNY'){
                        if(cur_text[0] == '100JPY'){
                            cur_flag = 'one_jpy';
                            cur_t = 'JPY';
                        }
                        else {
                            cur_t = cur_text[0];
                        }
                    }else if(cur_text[1] != 'CNY'){
                        cur_flag = 'two';
                        if(cur_t = cur_text[1] == '100JPY'){
                            cur_t = 'JPY';
                        }
                        else {
                            cur_t = cur_text[1];
                        }
                    }
                    // log.debug('cur_t',cur_t);
                    var cur_ns_id = changeCurrency(cur_t);
                    // log.debug('cur_ns_id',cur_ns_id);
                    if(cur_ns_id){
                        //创建记录
                        var exchange_rec = record.create({
                            type:'customrecord_real_time_exchange_rate',
                            isDynamic:true,
                        });
                        exchange_rec.setValue('name',cur_t + '/CNY');//名称
                        if(cur_flag == "one"){
                            exchange_rec.setValue('custrecord_rte_rates',Number(exchange_data.list[i][1]).toFixed(4));//汇率
                        }
                        else if(cur_flag == 'one_jpy'){
                            exchange_rec.setValue('custrecord_rte_rates',(Number(exchange_data.list[i][1])/100).toFixed(4));//汇率
                        }
                        else if(cur_flag == 'two'){
                            exchange_rec.setValue('custrecord_rte_rates',(1/Number(exchange_data.list[i][1])).toFixed(4));//汇率
                        }
                        exchange_rec.setValue('custrecord_rte_rate_currency',cur_ns_id);//币种
                        exchange_rec.save();
                    }
                }
            }          
        }
        function changeCurrency(cur_t){
            if(cur_t){
                var mysearch = search.create({
                    type:'currency',
                    filters:[
                        ['name','is',cur_t]
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                // log.debug('货币搜索',JSON.stringify(res));
                if(res.length > 0){
                    return res[0].id;
                }
            }
        }
        function getOnly(){
            var flag = 'Y';
            var mysearch = search.load('customsearch_cl_exchangerate_create');//实时汇率表当日创建
            var res = mysearch.run().getRange(0,1000);
            if(res.length > 0){
                flag = 'N';
            }
            return flag;
        }
        function getExchangeRate(body){
            var body = JSON.parse(body);     //将请求返回的数据转成JSON对象

            var exchange_rate_obj = new Object();
            var exchange_rate_arr = new Array();
            for(var i = 0;i < body.data.searchlist.length;i++){
                var exchange_rate = new Array();
                var key = body.data.searchlist[i];
                var value = body.records[0].values[i];
                // log.debug('key value',key + '---' + value);
                // exchange_rate[key] = value;       //TODO：对象添加新的键值对
                exchange_rate.push(key,value);
                exchange_rate_arr.push(exchange_rate)
            }
            // log.debug('exchange_rate_arr',exchange_rate_arr);
            if(exchange_rate_arr.length > 0){
                exchange_rate_obj.date = body.records[0].date;
                exchange_rate_obj.list = exchange_rate_arr;
                return exchange_rate_obj;
            }
        }
        function map(context) {
            log.debug({
                title: 'context map',
                details: context
            });
        }
        function reduce(context) {
            log.debug({
                title: 'context',
                details: context
            });
        }
        function summarize(summary) {
            log.debug({
                title: 'summary',
                details: summary
            });
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });