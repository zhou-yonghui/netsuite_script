/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/file',"../reportScript/customer_report_util", 'N/encode'],

function(runtime,search,file,reportUitl,encode) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
	
	//接收参数;
    var script = runtime.getCurrentScript();
	var dateStart = script.getParameter('custscript_i_datestart');
    var dateEnd = script.getParameter('custscript_i_dateend');
    var subsidiary = script.getParameter('custscript_i_subsidiary');
//    var subsidiaryName=companyById(subsidiary);
   
//    
    /**
	 * 根据公司编号获取公司
	 * 
	 */
	function companyById(id){

		var mySearch  = search.create({
			type : 'subsidiary',
			columns: [{
		        name: 'internalid'
		    }, {
		        name: 'name'
		    }, {
		        name: 'currency'
		    }],
		    filters: [{
		        name: 'internalid',
		        operator: 'is',
		        values: id
		    }],
		});
		
		
		var name;
		mySearch.run().each(function(result){			
			name=result.getValue("name");
			return true;
		});
		var strs=name.split(' : ');
		name=strs[strs.length-1];
		log.debug('查询公司',id+' '+name);
		return name;
	}
    
    function getInputData() {
    	log.debug('params',{sart:dateStart,end:dateEnd,subsidiary:subsidiary});
    	
    	var datas = new Array();
    	//账单数据
    	var billDatas = getBillDatas();
    	log.debug('billDatas',JSON.stringify(billDatas));
    	datas = datas.concat(billDatas);
    	//发票数据
    	var invDatas = getInvoiceDatas();
    	log.debug('invDatas',JSON.stringify(invDatas));
    	datas = datas.concat(invDatas);
    	
//        将构建好的数组数据 返回给map做进一步处理
        return datas;
        
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	 var row = JSON.parse(context.value);
    	log.debug('row',row);
    	var invoiceSearch;
    	if(row.status == 'bill'){
    		invoiceSearch=search.load('customsearch_hrkap_internalcontacts_invo');

        	invoiceSearch.filters.push(search.createFilter({
    			name:'createdfrom',
    			operator:search.Operator.IS,
    			values:row.internalid
    		}));
    	}else{
    		invoiceSearch=search.load('customsearch_hrkap_internalcontacts_bill');

        	invoiceSearch.filters.push(search.createFilter({
        		name: "internalid",
                join: "CUSTBODY_HRKPO_PO_ASSOCIATION",
    			operator:search.Operator.IS,
    			values:row.internalid
    		}));
    	}
    	var salefxamount = 0;
    	invoiceSearch.run().each(function(result){
    		salefxamount += parseFloat(result.getValue({
    			name: "fxamount",
                summary: "SUM",
                label: "金额（外币）"
    		}));
    		row.salename=result.getText({
        		name:'account',
                summary: "GROUP",
                label: "对方挂账会计科目"
            });
    		return true;
    	});
    	row.salefxamount = salefxamount;
    	row.diffamount=row.fxamount-row.salefxamount;
//    	log.debug('obj',JSON.stringify(row))
    	context.write(context.key, row);
//    	return row;
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    	log.debug('summary',summary);
    	// 捕捉异常
    	  var flag = true;
    	  var errorStr = '';
    	  if (summary.inputSummary.error != undefined) {
    	   summary.inputSummary.error.iterator().each(
    	     function(key, error, executionNo) {
    	      log
    	        .error({
    	         title : 'Input error for key: '
    	           + key + ', execution no.  '
    	           + executionNo,
    	         details : error
    	        });
    	      flag = false;
    	      errorStr += error;
    	      return true;
    	     });
    	  }
    	  if (summary.mapSummary.errors != undefined) {
    	   summary.mapSummary.errors.iterator().each(
    	     function(key, error, executionNo) {
    	      log
    	        .error({
    	         title : 'Map error for key: ' + key
    	           + ', execution no.  '
    	           + executionNo,
    	         details : error
    	        });
    	      flag = false;
    	      errorStr += error;
    	      return true;
    	     });
    	  }
    	  
//    	  处理数据
    	  var lines = new Array();
    	  var data={};
  		summary.output.iterator().each(function(key, value) {
//  			log.debug(key,value);
  			var item=JSON.parse(value);
  			var k=item.altname+item.account+item.subsidiarynohierarchy;
  			if(data[k]){
  				data[k].fxamount+=item.fxamount;
  				data[k].salefxamount+=item.salefxamount;
  				data[k].diffamount+=item.diffamount;
  			}else{
  				data[k]={
  						account:item.account,
  						subsidiarynohierarchy:item.subsidiarynohierarchy,
  						altname:item.altname,
  						fxamount:item.fxamount,
  						salefxamount:item.salefxamount,
  						salename:item.salename,
  						diffamount:item.diffamount
  				};
  			}
  			
  			return true;
  		});
  		var seq=1;
  		for(k in data){
  			data[k].seq=seq++;
  			lines.push(data[k]);
  		}
  		log.debug("lines",lines);
  		
//  		按单位名称汇总数据
  		
  		
  		
  		var excelModel=file.load({
			id : 'SuiteScripts/HRK/src/report/hk_Acc_ rec_table/acc_rec_table.xml'
		});
  		var xlsXML = reportUitl.renderPage(excelModel.getContents(),
				{
  					head:{
  						datestart:dateStart,
  						dateend:dateEnd,
  						subsidiary:companyById(subsidiary)
  					},
  					lines : lines
	  			}
  		);
  		//log.debug(subsidiaryName);
 		log.debug('xlsXML',xlsXML);
		var fileSavePath = "SuiteScripts/report/hk_Acc_rec_table";
		var fileObj = file.create({
			name : 'HRK-内部往来账核对明细表',
			fileType : file.Type.EXCEL,
			contents : encode.convert({
				string : xlsXML,
				inputEncoding : encode.Encoding.UTF_8,
				outputEncoding : encode.Encoding.BASE_64
			}),
			encoding : file.Encoding.UTF8,
			folder : reportUitl.getFolderId(fileSavePath),
			isOnline : true
		});
		var fileId = fileObj.save();
		log.debug({
			title : 'fileId',
			details : fileId
		});
    }

    function getBillDatas(){
//      加载以保存搜索，load只能用在以保存搜索中
        var vendorbillSearch=search.load('customsearch_hrkap_internalcontacts_bill');
//        内部往来账核对明细表-销售发票_View
        
        var arrVendorBill=[];
//        添加查询条件
        if(dateStart){
        	if(!dateEnd)
        		vendorbillSearch.filters.push(search.createFilter({
	        		name:'trandate',
	        		operator:search.Operator.ONORAFTER,
	        		values:dateStart
	        	}));
        	else{
        		vendorbillSearch.filters.push(search.createFilter({
        			name:'trandate',
        			operator:search.Operator.ONORAFTER,
        			values:dateStart
        		}));
        		vendorbillSearch.filters.push(search.createFilter({
        			name:'trandate',
        			operator:search.Operator.ONORBEFORE,
        			values:dateEnd
        		}));
        	}
        	
        }else if(dateEnd){
        	vendorbillSearch.filters.push(search.createFilter({
    			name:'trandate',
    			operator:search.Operator.ONORBEFORE,
    			values:dateEnd
    		}));
        }
        log.debug('filters',vendorbillSearch.filters);
        if(subsidiary!=null && subsidiary!='0'){
    		var subsidiaryArr = subsidiary.split("\u0005");
    		vendorbillSearch.filters.push(search.createFilter({
    			name :  "subsidiary",
                operator : 'anyof',
                values:subsidiaryArr
    		}));
        }
        
//        将查询结果放入数组
        var startIndex=0;
        do{
        	//分页;
            var vendorbill = vendorbillSearch.run().getRange({
                start: startIndex,
                end: startIndex + 1000
            });
        	
            length = vendorbill.length;
            for(var r=0;r<length;r++){

            	arrVendorBill.push({
            		tranid:vendorbill[r].getValue({
            			 name: "tranid",
            	         join: "CUSTBODY_HRKPO_PO_ASSOCIATION",
            	         summary: "GROUP",
            	         label: "销售订单"
                    }),
                    account:vendorbill[r].getText({
                    	name: "account",
                        summary: "GROUP",
                        label: "挂账会计科目"
                   }),
                   subsidiarynohierarchy:vendorbill[r].getValue({
                	   name: "subsidiarynohierarchy",
                       summary: "GROUP",
                       label: "子公司"
                  }),
                  altname:vendorbill[r].getValue({
               	   name: "altname",
                      join: "vendor",
                      summary: "GROUP",
                      label: "单位名称"
                 }),
                  fxamount:parseFloat( vendorbill[r].getValue({
                	  name: "fxamount",
                      summary: "SUM",
                      label: "期末余额"
                 })),
                 internalid:vendorbill[r].getValue({
                	 name: "internalid",
                     join: "CUSTBODY_HRKPO_PO_ASSOCIATION",
                     summary: "GROUP",
                     label: "销售订单ID"
                 }),
                 status : 'bill',
            	});
            }
            startIndex +=1000;
        }while(length==1000);
        //合并同一个销售订单的值
        var vendorBillArr = [];
        for(var m=0;m<arrVendorBill.length;m++){
        	var flag = false;
        	for(var k=0;k<vendorBillArr.length;k++){
        		if(arrVendorBill[m].internalid == vendorBillArr[k].internalid){
        			vendorBillArr[k].fxamount = parseFloat(vendorBillArr[k].fxamount)
        										+parseFloat(arrVendorBill[m].fxamount);
        			flag = true;
        			break;
        		}
        	}
        	if(!flag){
    			vendorBillArr.push({
    				tranid : arrVendorBill[m].tranid,
    				account : arrVendorBill[m].account,
    				altname : arrVendorBill[m].altname,
    				fxamount : arrVendorBill[m].fxamount,
    				internalid : arrVendorBill[m].internalid,
    				status : 'bill',
    			});
    		}
        	
        }
        return vendorBillArr;
    }
    
    //获取发票的数据
    function getInvoiceDatas(){
//      加载以保存搜索，load只能用在以保存搜索中
        var vendorbillSearch=search.load('customsearch_hrkap_internalcontacts_invo');
//        内部往来账核对明细表-销售发票_View
        var arrVendorBill=[];
//        添加查询条件
        if(dateStart){
        	if(!dateEnd)
        		vendorbillSearch.filters.push(search.createFilter({
	        		name:'trandate',
	        		operator:search.Operator.ONORAFTER,
	        		values:dateStart
	        	}));
        	else{
        		vendorbillSearch.filters.push(search.createFilter({
        			name:'trandate',
        			operator:search.Operator.ONORAFTER,
        			values:dateStart
        		}));
        		vendorbillSearch.filters.push(search.createFilter({
        			name:'trandate',
        			operator:search.Operator.ONORBEFORE,
        			values:dateEnd
        		}));
        	}
        	
        }else if(dateEnd){
        	vendorbillSearch.filters.push(search.createFilter({
    			name:'trandate',
    			operator:search.Operator.ONORBEFORE,
    			values:dateEnd
    		}));
        }
        log.debug('filters',vendorbillSearch.filters);
        if(subsidiary!=null && subsidiary!='0'){
    		var subsidiaryArr = subsidiary.split("\u0005");
    		vendorbillSearch.filters.push(search.createFilter({
    			name :  "subsidiary",
                operator : 'anyof',
                values:subsidiaryArr
    		}));
        }
        
//        将查询结果放入数组
        var startIndex=0;
        do{
        	//分页;
            var vendorbill = vendorbillSearch.run().getRange({
                start: startIndex,
                end: startIndex + 1000
            });
        	
            length = vendorbill.length;
            for(var r=0;r<length;r++){

            	arrVendorBill.push({
            		tranid:vendorbill[r].getValue({
            			name: "tranid",
            	         join: "createdFrom",
            	         summary: "GROUP",
            	         label: "销售订单"
                    }),
                    account:vendorbill[r].getText({
                    	name: "account",
                        summary: "GROUP",
                        label: "挂账会计科目"
                   }),
                   subsidiarynohierarchy:vendorbill[r].getValue({
                	   name: "subsidiarynohierarchy",
                       summary: "GROUP",
                       label: "子公司"
                  }),
                  altname:vendorbill[r].getValue({
                	  name: "altname",
                      join: "customer",
                      summary: "GROUP",
                      label: "客户"
                 }),
                  fxamount:parseFloat( vendorbill[r].getValue({
                	  name: "fxamount",
                      summary: "SUM",
                      label: "期末余额"
                 })),
                 internalid:vendorbill[r].getValue({
                	 name: "createdfrom",
                     summary: "GROUP",
                     label: "创建自"
                 }),
                 status : 'invoice',
            	});
            }
            startIndex +=1000;
        }while(length==1000);
        //合并同一个销售订单的值
        var vendorBillArr = [];
        for(var m=0;m<arrVendorBill.length;m++){
        	var flag = false;
        	for(var k=0;k<vendorBillArr.length;k++){
        		if(arrVendorBill[m].internalid == vendorBillArr[k].internalid){
        			vendorBillArr[k].fxamount = parseFloat(vendorBillArr[k].fxamount)
        										+parseFloat(arrVendorBill[m].fxamount);
        			flag = true;
        			break;
        		}
        	}
        	if(!flag){
    			vendorBillArr.push({
    				tranid : arrVendorBill[m].tranid,
    				account : arrVendorBill[m].account,
    				altname : arrVendorBill[m].altname,
    				fxamount : arrVendorBill[m].fxamount,
    				internalid : arrVendorBill[m].internalid,
    				status : 'invoice',
    			});
    		}
        	
        }
        return vendorBillArr;
    }
    
    return {
        getInputData: getInputData,
        map: map,
//        reduce: reduce,
        summarize: summarize
    };
    
});
