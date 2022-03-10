define(
    [],
    function() {
        return {
            RETURN_CODE : {
                PENDING : "P",
                SUCCESS : "S",
                ERROR : "E"
            },
            //自定义库存调整单审批状态
            APPROVAL_STATUS : {
                APPROVAVED : 2 , //已批准
            },
            //保留单状态
            INV_CHANGE_STATUS : {
                GOOD : 1 ,
                HOLD : 2
            },
            //单据处理状态
            RECORD_PROCESS_STATUS : {
                PRE_PROCESS : 1 , //待处理
                PROCESSING : 2 , //处理中
                PROCESS_SUCCESS : 3 , //处理成功
                PROCESS_ERROR : 4 , //处理失败
            },
            //采购退货类型
            PO_RETURN_TYPE : {
                PO_RETURN : "4",//采购退货
                BORROW_OUTBOUND : "5",//借用出库
                SCRAP_OUTBOUND : "6",//报废出库
                OTHER_OUTBOUND : "7",//其他出库
                REPAIR_OUTBOUND : "8",//返修出库
            },
            //OMS接口信息
            OMS_TOKEN : {
                 TOKEN : "729657b6667c4dcd9ef8addd6bbe23ca"
            },

        };

    });