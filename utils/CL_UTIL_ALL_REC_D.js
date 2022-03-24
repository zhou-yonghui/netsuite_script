/**
 *
 * @NModuleScope Public
 * @NAmdConfig ./configuration.json
 * @NApiVersion 2.x
 */
define(
	['N/https', 'N/search', 'N/record', 'N/url', 'N/file','./moment' ],
	function(https, search, record, url, file,moment) {
		// 获取订柜计划单及明细
		function getReservationPlan(nsId) {
			var rec;
			var brand;
			try{
				rec = record.load({
					type : "customrecord_hl_bsq_reservation_plan",
					id : nsId
				});
				var createTime = rec.getText('custrecord_creation_date');
				var items = [];
				var countItem = rec.getLineCount("recmachcustrecord_sl_rp_body");
				for(var i =0 ;i<countItem;i++){
					var mdLocationId = rec.getSublistValue({ // 目的仓nsId
						sublistId: 'recmachcustrecord_sl_rp_body',
						fieldId: 'custrecord_sl_dg_md_location',
						line: i
					})
					var lot = record.load({
						type: 'location',
						id: mdLocationId
					})
					var subrec = lot.getSubrecord({
						fieldId: 'mainaddress'
					});
					var item = {
						dgNsId: rec.getSublistValue({ // 订柜计划单明细nsId
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'id',
							line: i
						}),
						dgNo: rec.getSublistText({ // 订柜计划单明细单号
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'id',
							line: i
						}),
						removeOrderId: rec.getSublistValue({ // 移除单号
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_remove_order_number',
							line: i
						}),
						chNumber: rec.getSublistText({ // 出货计划单单号
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_ch_number',
							line: i
						}),
						type: rec.getSublistText({ // 出货计划类型
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_ch_type1',
							line: i
						}),
						startLocation: rec.getSublistText({ // 起始仓
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dc_start_location',
							line: i
						}),
						startLocationId: rec.getSublistValue({ // 起始仓nsId
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dc_start_location',
							line: i
						}),
						zzLocation: rec.getSublistText({ // 中转仓
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_zz_location',
							line: i
						}),
						zzLocationId: rec.getSublistValue({ // 中转仓nsId
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_zz_location',
							line: i
						}),
						mdLocation: rec.getSublistText({ // 目的仓
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_md_location',
							line: i
						}),
						mdLocationId: mdLocationId,
						portOfDeparture: rec.getSublistText({ // 起运港
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_port_of_departure',
							line: i
						}),
						shipmentId: rec.getSublistText({ // shipmentId/海外仓入库单
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_detail_shipment_id',
							line: i
						}),
						mudiContory: rec.getSublistText({ // 目的国
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_mudi_location',
							line: i
						}),
						skuNsId: rec.getSublistValue({ // skuskuNsId
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_detail',
							line: i
						}),
						sku: rec.getSublistText({ // sku
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_detail',
							line: i
						}),
						sellerSku: rec.getSublistValue({ // sellerSku
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_seller_sku',
							line: i
						}),
						fnsku: rec.getSublistValue({ // fnsku
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_fnsku2',
							line: i
						}),
						qty: rec.getSublistValue({ // QTY(实际)
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_sku_qty2',
							line: i
						}),
						subsidiaries: rec.getSublistValue({ // 附属公司
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_subsidiaries',
							line: i
						}),
						weight: rec.getSublistValue({ // 重量
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_grossweight',
							line: i
						}),
						volume: rec.getSublistValue({ // 体积
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_cbm',
							line: i
						}),
						boxAccount: rec.getSublistValue({ // 箱数
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_detail_ctns',
							line: i
						}),
						boxLimit: rec.getSublistValue({ // 箱率
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_sl_dg_detai_sku_pcs',
							line: i
						}),
						shopId: rec.getSublistValue({ // 店铺
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_account1',
							line: i
						}),
						shippingTotal: rec.getSublistValue({ // 发货累计
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_cumulative_shipment_quantity',
							line: i
						}),
						receivedTotal: rec.getSublistValue({ // 收货累计
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_cumulative_quantity_received',
							line: i
						}),
						platform: rec.getSublistValue({ // 平台
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_platform',
							line: i
						}),
                 shopId: rec.getSublistValue({ // 销售店铺
							sublistId: 'recmachcustrecord_sl_rp_body',
							fieldId: 'custrecord_account1',
							line: i
						}),
						name:subrec.getValue("attention"), // 收件人
						phone:subrec.getValue("addrphone"),//手机
						email:lot.getValue("custrecord_sl_lc_em"),//邮箱
						address:subrec.getValue("addr1")+""+subrec.getValue("addr2"),//addr1
						country:subrec.getValue("country"),//国家二字码
						province:subrec.getText("state"),//省
						city:subrec.getValue("city"),//城市
						postalCode:subrec.getValue("zip")//邮编
					}
					items.push(item)
				}

				brand = {
					"nsId": nsId, // 内部标识
					"name": rec.getValue('name'),//名称
					"brandNo": rec.getValue('custrecord_rm_record_spu_blan_sx'),//计划专员
					"type": rec.getValue('custrecord_business_type123'),//业务类型
					"businessType": rec.getText('custrecord_business_type'),//备货类型
					"cabinetType": rec.getText('custrecord_cabinet_type'),//柜型
					"portOfLoading": rec.getText('custrecord_port_of_loading'),//起运港
					"inputId": rec.getValue('custrecord_dg_inbound_id'),//入库ID
					"outId": rec.getValue('custrecord_dg_outbound_id'),//出库ID
					"items":items
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return brand;
		}
		// 获取品牌数据
		function getBrand(nsId) {
			var rec;
			var brand;
			try{
				rec = record.load({
					type : "customrecord_hl_brand",
					id : nsId
				});
				brand = {
					"internalId": nsId, // 内部标识
					"name": rec.getValue('name'),//名称
					"briefName": rec.getValue('custrecord_brand_abbreviation')//缩写
					// "createUser": rec.getValue('custrecord_rm_pp_creater')//创建人
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return brand;
		}
		// 获取SPU数据
		function getSPU(nsId) {
			var rec;
			var spu;
			try{
				rec = record.load({
					type : "customrecord_spu",
					id : nsId
				});
				spu = {
					"internalId": nsId, // 内部标识
					"name": rec.getValue('name'),//名称
					"custrecordBsqBrand":rec.getText('custrecord_bsq_brand'), // 品牌
					"custrecordSpecificationAndSize":rec.getText('custrecord_specification_and_size'), // 规格尺寸
					"custrecordBsqTypeSubclass":rec.getText('custrecord_bsq_type_subclass'), // 类型（小类）
					"custrecordBsqSerialNumber":rec.getValue('custrecord_bsq_serial_number') // 序列号
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return spu;
		}
		// 获取SKU数据
		function getSKU(nsId) {
			var rec;
			var sku;
			try{
				rec = record.load({
					type : record.Type.INVENTORY_ITEM,
					id : nsId
				});
				var development_time = rec.getText('custitem_hl_bsq_development_time');
				development_time = moment(development_time).toDate().getTime();
				var product_manager = ""; //产品经理
				try {
					var product_managerRec = record.load({
						type: record.Type.EMPLOYEE,
						id: rec.getValue("custitem_hl_product_manager")
					})
					product_manager = product_managerRec.getValue("custentity_sl_emploee_gh")
				} catch (e) {

				}
				var DevelopUser = "";// 产品开发
				try {
					var serial_numberRec = record.load({
						type: record.Type.EMPLOYEE,
						id: rec.getValue('custitem_hl_bsq_product_development')
					})
					DevelopUser = serial_numberRec.getValue("custentity_sl_emploee_gh")
				} catch (e) {

				}
				var quality_manager = ""; //品质负责人
				try {
					var quality_managerRec = record.load({
						type: record.Type.EMPLOYEE,
						id: rec.getValue('custitem_hl_quality_manager')
					})
					quality_manager = quality_managerRec.getValue("custentity_sl_emploee_gh")
				} catch (e) {

				}

				var hl_planner = ""; //计划人员
				try {
					var hl_plannerRec = record.load({
						type: record.Type.EMPLOYEE,
						id: rec.getValue('custitem_hl_planner')
					})
					hl_planner = hl_plannerRec.getValue("custentity_sl_emploee_gh")
				} catch (e) {

				}
				sku = {
					"bigType":rec.getText('custitem_rp_md_item_main_class'), // 大类名称
					"boxLimit":Number(rec.getValue('custitem_hl_xianglv')) , // 箱率
					"brand":rec.getText('custitem_rp_md_item_brand'), // 品牌名称
					"custitemHlBsqDevelopmentTime":development_time, // 产品开发时间
					"goodsAlias":rec.getText('custitem_hl_bsq_englis_name'), // 英文品名
					"goodsDevelopUser":DevelopUser,//产品开发负责人
					"goodsDutyUser":product_manager,//产品经理
					"goodsName":rec.getText('displayname'), // 显示名称/代码（产品中午名称）
					"goodsPhoto":rec.getValue('custitem_rp_md_item_productpicture'), // 商品图片地址
					"goodsPlanUser":hl_planner, //计划人员
					"goodsQualityUser":quality_manager,//品质负责人
					"internalId": nsId, // 内部标识
					"mainBasicUnit":rec.getValue('baseunit'), // 主要基本单位
					"sku": rec.getValue('itemid'),//sku编码
					"smallType":rec.getText('custitem_rp_md_item_subclass'), // 小类名称
					"spu":rec.getText('custitemspu'), // spu
					"type":rec.getValue('custitem_hl_bsq_status'),//类型
					"oldSku":rec.getText('custitem_hl_bsq_old_sku'),//老型号字段名
					"productLevel":rec.getText('custitem_hl_goods_grade'),//产品等级字段名
					"planLevel":rec.getText('custitem_sl_plan_levcl'),//计划等级字段名
					"productFamily":rec.getText('custitem_hl_bsq_product_group')//计划等级字段名
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return sku;
		}
		// 公司主数据
		function getSubsidiary(nsId) {
			var rec;
			var subsidiary;
			try{
				rec = record.load({
					type : record.Type.SUBSIDIARY,
					id : nsId
				})
				subsidiary = {
					"internalId": nsId, // 内部标识
					"companyname": rec.getValue('name'),//公司名称
					"parent":rec.getValue('parent'), // 父级子公司 ---——>缺少字段
					"standardMoney":rec.getText('currency') // 本位币
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return subsidiary;
		}
		// 部门主数据
		function getDepartment(nsId) {
			var rec;
			var department;
			try{
				rec = record.load({
					type : record.Type.SUBSIDIARY,
					id : nsId
				})
				department = {
					"nsId": nsId, // 内部标识
					"name": rec.getValue('name'),//部门名称
					"subsidiary":rec.getText('subsidiary'), // 子公司
					"parent":rec.getText('parent') // 父件部门
				}
			}catch(e){
				log.error({
					title : "错误！！",
					details : e.message +","+e.stack,
				})
			}
			return department;
		}
		return {
			getBrand:getBrand,
			getSPU:getSPU,
			getSKU:getSKU,
			getSubsidiary:getSubsidiary,
			getDepartment:getDepartment,
			getReservationPlan:getReservationPlan
		}
	});