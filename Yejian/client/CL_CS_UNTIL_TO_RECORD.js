/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord','N/https','N/url','N/search','N/record','../utils/CL_PU_GET_LABEL_UTIL',"../utils/CL_REQUEST_MODEL","../Common/commonTool.js"],
    function(currentRecord,https,url,search,record,dhlUtil,laberUtil,commonTool) {
        function pageInit(scriptContext){

        }

        function toNbPo(poid) {
            if(poid){
                window.open('https://7233301.app.netsuite.com/app/accounting/transactions/purchord.nl' + '?poid=' + poid);//todo:?+参数是合法的的链接


                // var url = window.location.href;
                // var poId = poid;
                // poId = encodeURIComponent(poId);
                // url = changeURLArg(url,'poId',poId);
                // url = changeURLArg('https://7233301.app.netsuite.com/app/accounting/transactions/purchord.nl');
                // setWindowChanged(window, false);
                // window.location.href = url;
            }
        }
        function toWbPo(soid) {
            if(soid){
                window.open('https://7233301.app.netsuite.com/app/accounting/transactions/purchord.nl' + '?soid=' + soid);//todo:?+参数是合法的的链接


                // var url = window.location.href;
                // var poId = poid;
                // poId = encodeURIComponent(poId);
                // url = changeURLArg(url,'poId',poId);
                // url = changeURLArg('https://7233301.app.netsuite.com/app/accounting/transactions/purchord.nl');
                // setWindowChanged(window, false);
                // window.location.href = url;
            }
        }
        function toBaojiaTmp(baojia_id) {
            window.open('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=32' + '&baojia_id=' + baojia_id);//报价单取值单

            var rec = currentRecord.get();
            // var slScript = 'customscript_cl_sl_muban_tmp';
            // var slDep = 'customdeploy_cl_sl_muban_tmp';
            // httpsToCustomRecord(slScript,slDep,rec);
        }
        function toPiPlCiTmp(record_id) {
            var rec = currentRecord.get();
            window.open('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=34' + '&record_id=' + record_id + '&record_type=' + rec.type);//模板打印取值单

            // var slScript = 'customscript_cl_sl_muban_tmp';
            // var slDep = 'customdeploy_cl_sl_muban_tmp';
            // httpsToCustomRecord(slScript,slDep,rec);    //TODO:尝试通过sl脚本来跳转页面
        }
        function toBfsh(record_id){
            var rec = currentRecord.get();
            // log.debug(record_id)
            window.open('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=137' + '&record_id=' + record_id + '&record_type=' + rec.type);//部分收货部分审核
        }
        function toBj(){
            var rec = currentRecord.get();
            // log.debug(record_id)
            window.open('https://7373203.app.netsuite.com/app/accounting/transactions/estimate.nl?whence=' + '&opportunity=' + rec.id);//部分收货部分审核
        }
        function findIsRemoteArea(param){
            Ext.MessageBox.wait('正在查询，请等待...');
            try {
                var currentRec = currentRecord.get();
                var countryName;
                var recipientCity;
                var PostalCode;
                if(param == "find"){
                    countryName = currentRec.getText("custpage_transport_country");
                    recipientCity = currentRec.getValue("custpage_order_city");
                    PostalCode = currentRec.getValue("custpage_order_zip");
                }else{
                    countryName = currentRec.getText("custbody_sl_sopeis");
                    recipientCity = currentRec.getValue("custbody_sl_distribution_city");
                    PostalCode = currentRec.getValue("custbody_sl_distribution_city_zip");
                }
                var countryCode;
                if(countryName){
                    var countrySearch = search.create({
                        type:"customrecord_country_im",
                        filters: [
                            { name: 'name', operator: 'is', values: countryName}
                        ],
                        columns: [
                            'custrecord_country_code'
                        ]
                    })
                    countrySearch.run().each(function (result){
                        countryCode = result.getValue("custrecord_country_code");
                    })
                }
                if(!countryCode){
                    Ext.MessageBox.hide();
                    alert("请选择国家")
                    return;
                }
                if(!recipientCity){
                    Ext.MessageBox.hide();
                    alert("请输入城市")
                    return;
                }
                if(!PostalCode){
                    Ext.MessageBox.hide();
                    alert("请输入邮编")
                    return;
                }
                //搜索默认 发货账号
                var accountNumber;
                var defAcountSearch = search.create({
                    type: "customrecord_sl_shipping_account",
                    columns: [
                        "custrecord_sl_shipping_account2",
                        "custrecord_sl_shipping_account1"
                    ],
                    filters: [
                        ["name", "is", "DHL默认账号"]
                    ]
                })
                var defShippingAddId;
                defAcountSearch.run().each(function (result) {
                    accountNumber = result.getValue("custrecord_sl_shipping_account2");
                    defShippingAddId = result.getValue("custrecord_sl_shipping_account1");
                })
                var defShippingRec;
                try {
                    defShippingRec = record.load({
                        type: "customrecord_sl_shipperinformation",
                        id: defShippingAddId
                    })
                } catch (e) {
                    log.debug("获取默认发货地址出错",e);
                    alert("获取默认发货地址出错："+e.message)
                }
                if(!defShippingRec){
                    alert("未找到默认发货地址")
                    return;
                }
                if (!accountNumber) {
                    alert("未找到默认发货账号")
                    return;
                }
                //获取默认DHL开发者账号
                var alias = laberUtil.getAccountByType("1") // 获取DHL开发者账号
                var body = {
                    alias: alias,
                    interfaceName: "getTrackingRequest",
                    accountNumber: accountNumber,
                    shipperStreetLines: defShippingRec.getValue("custrecord_sl_shipper_address1"),
                    shipperStreetLines2: defShippingRec.getValue("custrecord_sl_shipper_address2"),
                    shipperCity: defShippingRec.getValue("custrecord_sl_city1"),
                    shipperPostalCode: defShippingRec.getValue("custrecord_sl_post_code"),
                    shipperCountryCode: defShippingRec.getValue("custrecord_sl_country_code"),
                    recipientCity: recipientCity,
                    PostalCode: PostalCode,
                    CountryCode: countryCode
                }
                // recipientCity:"Prizzi",
                // PostalCode:"90038",
                // CountryCode:"IT"
                console.log("查询是否偏远地区-请求--", body)
                var response = dhlUtil.findIsRemoteArea(body)
                log.debug("查询是否偏远地区-响应--response", response)
                Ext.MessageBox.hide();
                if (response.returnCode == 1) {
                    var dhlResponse = response.returnObject;
                    var Service = dhlResponse.RateResponse.Provider[0].Service;
                    if(dhlResponse.RateResponse.Provider[0].Notification && !Service){
                        alert("查询是否偏远地区出错："+ JSON.stringify(dhlResponse.RateResponse.Provider[0].Notification));
                        return;
                    }
                    for (var i = 0; i < Service.length; i++) {
                        var Charge = Service[i].Charges.Charge;
                        for (var j = 0; j < Charge.length; j++) {
                            if (Charge[j].ChargeCode == "OO" && Charge[j].ChargeType == "REMOTE AREA DELIVERY") {
                                // alert("【是偏远地区】"+"\n国家:"+countryName+";\n城市:"+recipientCity+";\n邮编:"+PostalCode+";");
                                alert("是偏远地区");
                                return;
                            }
                        }
                    }
                    // alert("【非偏远地?区】"+"\n国家:"+countryName+";\n城市:"+recipientCity+";\n邮编:"+PostalCode+";");
                    alert("非偏远地区");
                } else {
                    alert(JSON.stringify(response));
                }
            } catch (e) {
                log.debug("错误",e)
                alert(JSON.stringify(e));
                Ext.MessageBox.hide();
            }
        }
        function reportExcel() {
            var rec = currentRecord.get();
            // alert(JSON.stringify(rec));
            var create_url = url.resolveScript({
                scriptId: 'customscript_cl_sl_report',    //
                deploymentId: 'customdeploy_cl_sl_report'
            });
            var headers = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            }
            var response = https.post({
                url: create_url,
                body: {
                    recordId: rec.id,
                    recordType: rec.type
                },
                headers: headers
            });
            if(response.body != 'N'){
                alert('打印成功');
            }else if(response.body == 'N'){
                alert('生成打印文件出错,请检查');
            }
        }
        function httpsToCustomRecord(slScript,slDep,rec) {
            var create_url = url.resolveScript({
                scriptId: slScript,    //
                deploymentId: slDep
            });
            var headers = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            }
            var response = https.post({
                url: create_url,
                body: {
                    recordId: rec.id,
                    recordType: rec.type
                },
                headers: headers
            });
        }
        function toRl(id){
            // var do_flag = findScriptRec(id);
            // if(do_flag == 'do'){
            //创建脚本执行记录
            // var do_id = createScriptRec(id);

            //判断
            var rec = record.load({type:'customrecord_sl_dktz_list',id:id,isDynamic:true});
            var payType = rec.getValue('custrecord_sl_fkfs');
            var dk_a = rec.getValue('custrecord_sl_dkje');
            var tk_a = rec.getValue('custrecord_sl_tkje');
            var is_so = rec.getValue('custrecord_sl_xsdd');
            if(!is_so){
                alert('请填写销售订单');
            }
            else {
                if(!dk_a && !tk_a){
                    alert('填写到款金额或者退款金额');
                }else {
                    if(payType) {
                        var if_yz = record.load({
                            type: 'customrecord_sl_glfkfs',
                            id: payType,
                            isDynamic: true
                        }).getValue('custrecord_pm_need_verification');
                        var sell_bh = rec.getValue('custrecord_sl_mjbh');//
                        var xyyz = rec.getValue('custrecord_sl_xyyz');//
                        var xy_memo = rec.getValue('custrecord_sl_dk_khxybz');//
                        if (if_yz == true && sell_bh == false && xyyz == false) {
                            alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选');
                        } else if (if_yz == true && sell_bh == false && xyyz == true && !xy_memo) {
                            alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选，且“客户信用验证备注”必须选择值');
                        }else {
                            commonTool.startMask('正在处理，请稍后..............');
                            var create_url = url.resolveScript({
                                scriptId: 'customscript_cl_sl_dkrl',    //
                                deploymentId: 'customdeploy_cl_sl_dkrl'
                            });
                            var headers = {
                                "Content-Type": "application/json;charset=utf-8",
                                "Accept": "application/json"
                            }
                            /**************************************/
                            // var response = https.post({
                            //     url: create_url,
                            //     body:{
                            //         recordId: rec.id,
                            //         recordType: rec.type,
                            //         soId:rec.getValue('custrecord_sl_xsdd'),
                            //         usd:rec.getValue('custrecord_sl_dkmj'),
                            //         // doScriptId:do_id,
                            //     },
                            //     headers:headers
                            // });
                            //
                            // if(response.body == 'Y'){
                            //     // window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=5&id=' + rec.id);
                            //     //
                            //     window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?id='+ rec.id +'&rectype=5&whence=');
                            // }
                            // else if(response.body == 'MAP_REDUCE_ALREADY_RUNNING'){
                            //     alert('脚本已被占用，一分钟后手动刷新页面再试');
                            // }
                            // else{
                            //     alert(response.body);
                            // }
                            /***************异步请求post***********************/
                            var response = https.post.promise({
                                url: create_url,
                                body:{
                                    recordId: rec.id,
                                    recordType: rec.type,
                                    soId:rec.getValue('custrecord_sl_xsdd'),
                                    usd:rec.getValue('custrecord_sl_dkmj'),
                                    // doScriptId:do_id,
                                },
                                headers:headers,
                            }).then(function (response){
                                // alert(response);
                                if(response.body == 'Y'){
                                    commonTool.endMask();
                                    // window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=5&id=' + rec.id);
                                    //
                                    window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?id='+ rec.id +'&rectype=5&whence=');
                                }else {
                                    commonTool.endMask();
                                    alert(response.body);
                                }
                            });
                        }
                    }
                    else {
                        alert('请填写付款方式');
                    }
                }
            }
            // }else {
            //     alert('脚本正在执行，请不要重复操作');
            // }
        }
        function toDktzDd(id){
            var rec = record.load({type:'customrecord_sl_dktz_list',id:id,isDynamic:true});
            // var payType = rec.getValue('custrecord_sl_fkfs');
            // var dk_a = rec.getValue('custrecord_sl_dkje');
            // var tk_a = rec.getValue('custrecord_sl_tkje');
            // var is_so = rec.getValue('custrecord_sl_xsdd');
            // if(!is_so){
            //     alert('请填写销售订单');
            // }
            // else {
            //     if(!dk_a && !tk_a){
            //         alert('填写到款金额或者退款金额');
            //     }
            //     if(payType){
            //         var if_yz = record.load({type:'customrecord_sl_glfkfs',id:payType,isDynamic:true}).getValue('custrecord_pm_need_verification');
            //         var sell_bh = rec.getValue('custrecord_sl_mjbh');//
            //         var xyyz = rec.getValue('custrecord_sl_xyyz');//
            //         var xy_memo = rec.getValue('custrecord_sl_dk_khxybz');//
            var dk_status = rec.getValue('custrecord_sl_dkzt');
            var order_qk = rec.getValue('custrecord_sl_ddsm');//
            if(dk_status == 2 && (order_qk == '' || order_qk == null)){
                alert('待定状态下订单情况必填');
            }
                // else if(if_yz == true && sell_bh == false && xyyz == false){
                //     alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选');
                // }
                // else if(if_yz == true && sell_bh == false && xyyz == true && !xy_memo){
                //     alert('付款方式是设置了”需要验证“的”付款方式“，且如果到款通知”卖家保护“没有勾选，则要求”信用验证“必须勾选，且“客户信用验证备注”必须选择值');
            // }
            else {
                rec.setValue('custrecord_sl_daid',true);
                var save_id = rec.save();
                if(save_id){
                    //刷新页面
                    window.location.replace('https://7373203.app.netsuite.com/app/common/custom/custrecordentry.nl?id='+ id +'&rectype=5&whence=');
                }
            }
            // }
            // else {
            //     alert('请填写付款方式');
            // }
            // }
        }
        function createScriptRec(id){
            if(id){
                var do_rec = record.create({
                    type:'customrecord_cl_dktz_script_do',
                });
                do_rec.setValue('custrecord25',id);
                do_rec.setValue('custrecord26',true);
                var do_rec_id = do_rec.save();
                return do_rec_id;
            }
        }
        function findScriptRec(id){
            if(id){
                var mysearch = search.create({
                    type:'customrecord_cl_dktz_script_do',
                    filters:[
                        ['custrecord25','anyof',id],
                        'AND',['custrecord26','is',true],
                    ]
                });
                var res = mysearch.run().getRange(0,1);
                if(res.length > 0){
                    return 'notdo';
                }
                else {
                    return 'do';
                }
            }
        }
        function test(id){
            alert(id);
            // var rec = currentRecord.get();
            // log.debug('rec',JSON.stringify(rec));
        }
        return {
            toBaojiaTmp:toBaojiaTmp,
            toPiPlCiTmp:toPiPlCiTmp,
            reportExcel:reportExcel,
            pageInit: pageInit,
            toBfsh:toBfsh,
            toBj:toBj,
            toRl:toRl,
            toDktzDd:toDktzDd,
            test:test,
            findIsRemoteArea:findIsRemoteArea
        }
    });
