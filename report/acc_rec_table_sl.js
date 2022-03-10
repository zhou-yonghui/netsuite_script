/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/runtime','N/task',"N/search",'N/ui/serverWidget',"../reportScript/customer_report_util"],

function(ui,runtime,task,search,serverWidget,reportUtil) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
//	检索页面的表单
	var form;
    function onRequest(context) {
    	try{
    		
    		if(context.request.method=='POST'){//页面提交后的操作
        		submit(context);
        	}else{//GET请求加载页面
        		context.response.writePage(draw());
        	}
    	}
    	catch(e){
    		log.error("e", JSON.stringify(e));
    	}
    }

    function allSubsidiary(){//获取所有子公司
        var mySearch  = search.load({
            id : 'customsearch_voucher_subsidiary_view'
        });
        var rows = [];
        mySearch.run().each(function(result){
            var row={};
            row.id=result.getValue("internalid");
            row.value=result.getValue("namenohierarchy");
//			row[id]=value;
            rows.push(row);
            return true;
        });
        log.debug('获取子公司',rows);
        return rows;
    }
    //绘制查询条件界面
    function draw(){
//    	创建表单
    	form = ui.createForm({
            title: 'HRK-内部往来账核对明细表(应收|应付)<br/>HRK-Danh sách kiểm tra tài khoản hiện tại nội bộ(Phải thu|phải trả)'
        });
//    	添加输入分组
    	form.addFieldGroup({
			id : 'custpage_groupquery',
			label : '查询条件'
		});
//    	添加表单的输入字段
        var q_subsidiary=form.addField({
            id : 'custpage_q_subsidiary',
            type : ui.FieldType.SELECT,
            label : '公司名称|CÔNG TY CON',
            // source : 'subsidiary',
            container : 'custpage_groupquery'
        });
        q_subsidiary.isMandatory = true;

        var coms=allSubsidiary();
        for (var i=0;i<coms.length;i++) {
            // log.debug(coms[i])
            q_subsidiary.addSelectOption({
                value : coms[i]['id'],
                text :  coms[i]['value']
            });
        }

    	var q_dateStart = form.addField({
    	    id : 'custpage_q_datestart',
    	    type : ui.FieldType.DATE,
    	    label : '日期自| TỪ NGÀY',
    	    container:'custpage_groupquery'
    	});



    	var q_dateEnd = form.addField({
    	    id : 'custpage_q_dateend',
    	    type : ui.FieldType.DATE,
    	    label : '日期至| TỪ NGÀY',
    	    container:'custpage_groupquery'
    	});
    	
//    	添加按钮
    	form.addSubmitButton({
			label : '提交 Gửi',
			container:'custpage_groupquery'
		});
//		form.addButton({
//			id : 'custpage_reset',
//			label : '重置',
//			functionName : 'handleReset()'
//		});
    	
//    	挂载客户端脚本文件
		form.clientScriptModulePath = "SuiteScripts/HRK/src/report/hk_Acc_ rec_table/acc_rec_table_cs.js";
    	return form;
    }

    
    function submit(context){
    	var params = context.request.parameters;
    	log.debug(JSON.stringify(params));
    	try{
    		
    		 form=draw();
    		 context.response.writePage(form);	//将表单渲染到页面

    		 //    		 回写表单输入的值
             form.updateDefaultValues({
             	custpage_q_datestart : params.custpage_q_datestart,
             	custpage_q_dateend :  params.custpage_q_dateend,
             	custpage_q_subsidiary : params.custpage_q_subsidiary
     			
     		});
            
          //创建mr脚本;
            var mrTask =  task.create({
                taskType : task.TaskType.MAP_REDUCE,
                scriptId : 'customscript_acc_rec_table_mr',
                deploymentId : 'customdeploy_acc_rec_table_mr',
                // deploymentId : 'customdeploy2',
                params : {
                    //传参;
                	custscript_i_datestart : params.custpage_q_datestart,
                	custscript_i_dateend : params.custpage_q_dateend,
                	custscript_i_subsidiary : params.custpage_q_subsidiary
                }
            });
//            启动mr脚本
            var taskId = mrTask.submit();
            
//            加载请求进度条
            form = showProgress(form, taskId,false);
           
    	}catch(e){
    		log.error("e",e);
    		if (e.name) {
				form = showProgress(form, null, "请求正在运行中，请稍后再试",null,null);
			} else {
				form = showProgress(form, null, e,null,null);
			}
    	}
    	context.response.writePage(form);
    }
    
    
    
    
   
    
//    请求进度条
    function showProgress(form, taskId, errMsg) {
		form.addFieldGroup({
			id : 'custpage_progress_group',
			label : '运行进度'
		});

		var progress = form.addField({
			id : 'custpage_progress',
			type : 'inlinehtml',
			label : "label",
			container : 'custpage_progress_group'
		});
		progress.updateDisplayType({
			displayType : 'inline'
		});
		progress.updateDisplaySize({
			height : 25,
			width : 200
		});
		progress.updateLayoutType({
			layoutType : serverWidget.FieldLayoutType.NORMAL
		});
		if (errMsg) {
			progress.defaultValue = '<div id="reportProgress" '
					+ 'style="margin-top:15px;font-size:14px;color:red;font-weight:bold;">'
					+ errMsg + '</div>';
		} else {
			progress.defaultValue = '<div id="reportProgress" style="margin-top:15px;font-size:14px;color:#4d5f79;font-weight:bold;">'
					+ '请求正在运行，请勿刷新界面...</div>';
			var rtpTaskId = form.addField({
				id : 'custpage_rtp_task_id',
				type : 'text',
				label : "rtpTaskId"
			});
			rtpTaskId.updateDisplayType({
				displayType : 'hidden'
			});
			rtpTaskId.defaultValue = taskId;

//			生成文件的服务器路径
			var fileSavePath = "SuiteScripts/report/hk_Acc_rec_table";

			var folderId = form.addField({
				id : 'custpage_folder_id',
				type : 'text',
				label : "folderId"
			});
			folderId.updateDisplayType({
				displayType : 'hidden'
			});
			folderId.defaultValue = reportUtil
					.getFolderId(fileSavePath);
			var fileName = form.addField({
				id : "custpage_file_name",
				type : 'text',
				label : 'fileId'
			});
			fileName.updateDisplayType({
				displayType : 'hidden'
			});
			fileName.defaultValue = 'HRK-内部往来账核对明细表';
		}
		return form;
	}
    
    return {
        onRequest: onRequest
    };
    
});
