// import { useCatalogStore } from '@/store/appStore/catalogStore';
import { useBasketStore } from "@/store/appStore/useBasketStore";

// const catalogStore = useCatalogStore();

function CatalogApp() {
	var self = this;

	// Безопасная начальная инициализация для предотвращения обращения к undefined
	// Используется в doChangeProps через self.raspil[<align>]
	this.raspil = this.raspil || {};

	// var apiPath = '/ajax';
	var apiPath = 'https://vardek.ru/local/templates/constructor';

	this.minBasketTimer = 0;
	this.UpMenuTimer = 0;
	this.getPriceTimer = 0;

	this.productIsInit = false;

	this.start = function () {
		// self.initCallBackForm();
		// self.initEvents();
		// self.catalogPremiumInitSlider();
		// self.initOrderDatePicker();
		self.catalogInitProduct($(".main__product .product__wrapper"), self.catalogElementGetPrice, self.catalogAddToBasket);
		// self.InitMap();
	}

	this.initEvents = function () {

		$(document).on('click', ".fancybox-frame", function () {
			var autosize = $(this).data('autosize') || false;
			var href = $(this).prop('href') || $(this).data('href');
			$.fancybox({
				width: $(this).data('width'),
				height: $(this).data('height'),
				hideOnOverlayClick: false,
				hideOnContentClick: false,
				autoSize: autosize,
				type: 'iframe',
				autoDimensions: false,
				href: href
			});

			return false;

		}).on('click', ".fancybox-ajax", function () {

			$.fancybox({
				type: 'ajax',
				width: $(this).data('width'),
				height: $(this).data('height'),
				helpers: {
					overlay: { closeClick: false }
				},
				autoSize: true,
				autoDimensions: false,
				href: $(this).data('href')
			});

			return false;

		}).on('submit', '.ajax-form', function (e) {

			$.ajax({
				type: 'post',
				async: true,
				url: $(this).prop('action'),
				data: new FormData(this),
				contentType: false,
				processData: false,
				success: function (data) {
					if (data.callback) {
						var tempFun = new Function(data.callback);
						tempFun();
					}
				}
			});

			return false;
		}).on("click", ".showMap", function () {
			$('.contacts-section').fadeOut();
			$('.main-map').fadeIn();
			$("body,html").animate({ scrollTop: $('.main-map').offset().top }, 300);
			return false;
		}).on("click", "#cooperation_ban", function () {
			$('#cooperation_form').toggle();
			$("body,html").animate({ scrollTop: $('#cooperation_form').offset().top }, 300);

		}).on("click", ".catalog-collections .tabs-title li a", function () {
			$(".catalog-collections .tabs-title .active").removeClass("active");
			$(this).parent().addClass("active");

			$(".catalog-collections .tabs-content .tab-content").hide();

			$(".catalog-collections .tabs-content .tab-content:eq(" + $(this).parent().index() + ")").show();

			return false;
		}).on("click", "#main .up", function () {
			$("body,html").animate({ scrollTop: 0 }, 300);
			return false;
		}).on("change", ".where-to-buy .shops .select select", function () {
			if ($(this).val() == 0) {
				$(".where-to-buy .shops .items li").show();
			}
			else {
				$(".where-to-buy .shops .items li").hide();
				$(".where-to-buy .shops .items li[_id='" + $(this).val() + "']").show();
			}
		}).on("click", ".catalog-element .lists .tabs a", function () {
			$(".catalog-element .lists .tabs li").removeClass("current");
			$(this).parent().addClass("current");

			$(".catalog-element .lists .tabs-content .tab-content").hide();
			$(".catalog-element .lists .tabs-content .tab-content:eq(" + $(this).parent().index() + ")").show();
			return false;
		}).on("click", ".delivery-info .other a", function () {
			$(".delivery-info .elems .hiddenel").hide(0);
			$(".delivery-info .elems .hiddenel:eq(" + $(this).parent().index() + ")").fadeIn(100);
			return false;
		}).on("click", ".delivery-info .elems .hiddenel .close", function () {
			$(this).parent().fadeOut(100);
			return false;
		}).on("click", "#header .cities .first-visit .close_you_city", function () {
			$("#header .cities .first-visit").hide();
			return false;
		}).on("change", ".basket-wrap .basket .options input", function () {
			var elem = $(this);
			var group = $(this).attr("_groups").split(",");

			if (elem.prop("checked")) {
				if (group.length == 2) {
					$(".basket-wrap .basket .options input:checked").each(function () {
						if ($(this).val() != $(elem).val()) {
							var this_group = $(this).attr("_groups").split(",");
							if (this_group.length == 1)
								for (var i in group) {
									if (group[i] == this_group[0]) {
										$(this).prop("checked", false);
										break;
									}
								}
						}
					});
				}
				else {
					$(".basket-wrap .basket .options input:checked").each(function () {
						if ($(this).val() != $(elem).val()) {
							var this_group = $(this).attr("_groups").split(",");
							for (var i in this_group) {
								if (this_group[i] == group[0]) {
									$(this).prop("checked", false);
									break;
								}
							}
						}
					});
				}
				self.catalogBasketOptionsChange($(elem).val(), true);
			}
			else self.catalogBasketOptionsChange($(elem).val(), false);
		}).on("click", ".basket-wrap .basket .clean", function () {
			if (confirm("Вы действительно хотите удалить все товары из корзины?")) {
				$.ajax({ type: "GET", async: true, url: apiPath + "/API/basket.clean.php" }).done(function (msg) {
					document.location = document.location;
				});
			}
			return false;
		}).on("click", ".basket-wrap .basket .load", function () {
			$.ajax({
				type: "GET",
				async: true,
				url: apiPath + "/API/basket.baskets.get.php"
			}).done(function (msg) {
				$(".popup-wrap").html(msg);
				$(".popup-wrap").fadeIn(100);

				$(".popup-wrap").css("height", $(document).height());
				$(".popup-wrap .baskets").css("top", $(document).scrollTop() + 90);
			});
			return false;
		}).on("click", ".popup-wrap .baskets .del", function (e) {
			var id = $(this).data('id');
			self.Confirm("Вы действительно хотите удалить сохранённую корзину?", function () {
				$.ajax({
					type: "GET",
					async: true,
					url: apiPath + "/API/basket.baskets.get.php",
					data: { 'action': 'delete', 'id': id }
				}).done(function (msg) {
					$(".popup-wrap").html(msg);
					$(".popup-wrap .baskets").css("top", $(document).scrollTop() + 90);
				});
				return false;
			});
			return false;
		}).on("click", ".basket-wrap .basket .save", function () {
			var date = new Date();
			var name = name = date.getFullYear() + "." + (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1) + "." + (date.getDate() < 10 ? "0" : "") + date.getDate() + " " + (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + ":" + (date.getSeconds() < 10 ? "0" : "") + date.getSeconds() + " ";
			name = prompt("Укажите название для корзины:", name);

			if (!name) return false;

			$.ajax({
				type: "POST",
				async: true,
				url: apiPath + "/API/basket.save.php",
				data: { NAME: name }
			}).done(function (msg) {
				if (msg == "success") alert("Корзина успешно сохранена.");
				else alert(msg.split(":")[1]);
			});

			return false;
		}).on("click", ".basket-wrap .basket .delete", function () {
			if (confirm("Вы действительно хотите удалить из корзины этот товар?")) return true;
			else return false;
		}).on("blur", ".basket-wrap .basket .quantity input", function () {
			var v = parseInt($(this).val()) || 1;
			if (v < 1) v = 1;
			$(this).val(v);
			self.catalogBasketItemQuantityUpdate($(this).attr("_id"), $(this).val());
		}).on("click", ".basket-wrap .basket .quantity .minus", function () {
			var v = parseInt($(this).parents('.input-group').find("input").val()) - 1;
			if (v < 1) v = 1;
			$(this).parents('.input-group').find("input").val(v);
			self.catalogBasketItemQuantityUpdate($(this).parents('.input-group').find("input").attr("_id"), $(this).parents('.input-group').find("input").val());
			return false;
		}).on("click", ".basket-wrap .basket .quantity .plus", function () {
			var v = parseInt($(this).parents('.input-group').find("input").val()) + 1;
			$(this).parents('.input-group').find("input").val(v);
			self.catalogBasketItemQuantityUpdate($(this).parents('.input-group').find("input").attr("_id"), $(this).parents('.input-group').find("input").val());
			return false;
		}).on("click", ".catalog-section .elems li .elem .to-basket, .basket-wrap .basket .title, .catalog-element .elem .to-basket, .stock_elements .title", self.catalogGetElement
		).on("click", ".popup-wrap .close", function () {
			$(".popup-wrap").hide();
			$(".popup-wrap").empty();
			$('body').css('overflow', 'visible');
			return false;
		}).on('click', '.catalog-grid-type a', self.catalogChangeCatalogView
		).on('change', '.filter-instock input', function () {
			if ($(this).prop('checked')) {
				window.location = $(this).data('url') + '?instock=on';
			} else {
				window.location = $(this).data('url');
			}
		}).on('click', ".basket-form .print, .basket-form-min .print", self.catalogprintBasket
		).on('click', ".basket-form-min .close", self.catalogcloseBasketMin
		).on('click', ".basket-form-min .delete, #order_form .delete, #orderattach .delete", self.catalogremoveBasketMinItem
		).on('change', ".fancy-instock input", self.catalogGetElement
		).on('mouseenter', "#header a.basket, .basket-min", function () {
			clearTimeout(self.minBasketTimer);

			if (!$('.basket-min').is('.showed')) {
				self.catalogShowBasketMin();
			}
		}
		).on('mouseleave', "#header a.basket, .basket-min", function () {
			self.minBasketTimer = setTimeout(function () {
				self.catalogcloseBasketMin();
			}, 500);
		}
		).on('mouseenter', "#header .top_menu .menu > .parent", function () {
			$('body').addClass('topmenuhovered');
		}).on('mouseleave', "#header .top_menu .menu > .parent", function () {
			$('body').removeClass('topmenuhovered');
		}).on("change", ".shipping_expedited input", function (e) {
			if (this.checked)
				self.initOrderDatePicker($(this).data('shipment-start'), $(this).data('shipment-period'));
			else
				self.initOrderDatePicker();
		});

		$(".fancybox").fancybox({
			beforeShow: function () {
				var imgAlt = $(this.element).find("img").attr("alt");
				var dataAlt = $(this.element).data("alt");
				if (imgAlt) {
					$(".fancybox-image").attr("alt", imgAlt);
				} else if (dataAlt) {
					$(".fancybox-image").attr("alt", dataAlt);
				}
			}
		});

		toastr.options = {
			"closeButton": true,
			"debug": false,
			"newestOnTop": false,
			"progressBar": false,
			"positionClass": "toast-bottom-right",
			"preventDuplicates": true,
			"onclick": null,
			"showDuration": "300",
			"hideDuration": "1000",
			"timeOut": "3000",
			"extendedTimeOut": "1000",
			"showEasing": "swing",
			"hideEasing": "linear",
			"showMethod": "fadeIn",
			"hideMethod": "fadeOut"
		}

	}

	// this.catalogAddToBasket = function (e) {
	// 	$.ajax({
	// 		type: "POST",
	// 		async: true,
	// 		url: apiPath + "/API/catalog.element.addtobasket.php",
	// 		data: $(e.currentTarget).parentsUntil(".product__wrapper").parent().find(".product__form").serialize()
	// 	}).done(function (msg) {
	// 		if (msg && msg.type == 'error') {
	// 			self.toastmessage(msg.data, 'error');
	// 		} else {
	// 			$(".popup-wrap").hide();
	// 			self.catalogBasketUpdate(true);
	// 			self.toastmessage('Товар успешно добавлен в корзину.', "success");
	// 		}
	// 	});
	// }

	this.catalogAddToBasket = function (e) {
		const target = e.currentTarget;
		// ищем форму (аналог jQuery: $(e.currentTarget).parentsUntil(".product__wrapper").parent().find(".product__form"))
		const form = target.closest(".product__wrapper")?.querySelector(".product__form");

		if (!form) {
			console.error("Форма не найдена");
			return;
		}

		// собираем данные формы
		const formData = new FormData(form);
		// const formDataObj = Object.fromEntries(formData.entries());

		const formDataObj = {};

		for (let [key, value] of formData.entries()) {
			const isArrayKey = key.endsWith('[]');
			const cleanKey = isArrayKey ? key.slice(0, -2) : key;

			if (isArrayKey) {
				// Поля name="FOO[]" всегда накапливаются в массив
				if (!Array.isArray(formDataObj[cleanKey])) {
					formDataObj[cleanKey] = [];
				}
				formDataObj[cleanKey].push(value);
			} else if (cleanKey in formDataObj) {
				// Дублирующиеся обычные ключи → массив
				if (Array.isArray(formDataObj[cleanKey])) {
					formDataObj[cleanKey].push(value);
				} else {
					formDataObj[cleanKey] = [formDataObj[cleanKey], value];
				}
			} else {
				formDataObj[cleanKey] = value;
			}
		}


		const basketStore = useBasketStore();
		basketStore.addFromCatalog(formDataObj);
		self.toastmessage("Товар успешно добавлен в корзину.", "success");

		// fetch(apiPath + "/API/data.basket.getprice.php", {
		// 	method: "POST",
		// 	body: formData  
		// })
		// 	.then(response => response.json())
		// 	.then(msg => {
		// 	if (msg && msg.type === "error") {
		// 		self.toastmessage(msg.data, "error");
		// 	} else {
		// 		document.querySelectorAll(".popup-wrap").forEach(el => el.style.display = "none");
		// 		self.catalogBasketUpdate(true);
		// 		self.toastmessage("Товар успешно добавлен в корзину.", "success");
		// 	}
		// 	})
		// 	.catch(err => {
		// 	console.error("Ошибка при добавлении в корзину:", err);
		// 	self.toastmessage("Произошла ошибка при добавлении товара.", "error");
		// 	});

	};


	this.catalogPremiumInitSlider = function () {

		self.premiumSliderCountSumm = 0;

		/*if($("#premium_slider_wrap").length)
		 $('#container').addClass('slide_mode');*/


		$('#premium_slider').on('init', function (event, slick) {
			self.premiumSliderCountSumm = slick.slideCount;
			self.catalogPremiumSetSlide(0);
		}).on('beforeChange', function (event, slick, currentSlide, nextSlide) {
			self.catalogPremiumSetSlide(nextSlide, currentSlide);
		}).slick({
			slidesToShow: 10,
			slidesToScroll: 10,
			infinite: true,
			speed: 1000,
			centerMode: true,
			variableWidth: true,
			autoplay: true,
			autoplaySpeed: 6000,
			focusOnSelect: true,
			prevArrow: '.premium_slider_arrow_left',
			nextArrow: '.premium_slider_arrow_right'
		});
		// On before slide change

		$('.premium_slider_toggle_btn').on('click', function () {
			$('#premium_slider_control').toggleClass('hid');
		})

		$('.premium_slider_close, .premium_slider_open').on('click', function () {
			$('#container').toggleClass('slide_mode');
		})
	}

	this.catalogPremiumSetSlide = function (i, o) {
		var src = $('.slide' + i).data('src'),
			old_src = $('.slide' + o).data('src'),
			href = $('.slide' + i).data('href');

		$('#premium_slider_canvas_bg').css({ 'background-image': "url(" + old_src + ")" }).show();
		$('#premium_slider_canvas').css({ 'background-image': "url(" + src + ")" }).css({ opacity: 0 }).animate({ opacity: 1 }, 500, function () {
			$('#premium_slider_canvas_bg').hide();
		});

		if (href) {
			$('#premium_slider_canvas').on('click', function () {
				window.location = href;
			});
			$('#premium_slider_canvas').addClass('cursor-pointer');
		} else {
			$('#premium_slider_canvas').off('click');
			$('#premium_slider_canvas').removeClass('cursor-pointer');
		}

		$('#premium_slider_count').html((i + 1) + ' / ' + self.premiumSliderCountSumm);
	}

	this.catalogInitProduct = function (parent, ElementGetPriceFunc, addToBasketFunc) {
		if (!self.productIsInit)
			self.catalogInitEvent(ElementGetPriceFunc, addToBasketFunc);

		self.catalogInitElementProps(parent, ElementGetPriceFunc);
		ElementGetPriceFunc(parent);
	}

	this.doChangeProps = function (elem) {

		let id = elem.prop('id');

		let propsShow = {};

		let prop_parent = elem.parents('.values');

		let root_prop_parent = elem.parents('.prop');

		let form_parent = elem.parents('form');

		let enableForm = {}

		let disableProp = [];

		let isseparate = !!$('input[data-isseparate=1]:checked').length;

		let recall = false;

		if (elem.prop("checked")) {
			/*Если есть доп-картинка начало*/
			if ($(elem).attr("_preview")) {
				$(".prop-facades .current a").attr("href", $(elem).parent().attr("_pic"));
				$(".prop-facades .current img").attr("src", $(elem).attr("_preview"));
				$(".prop-facades .current .name").html($(elem).attr("_preview_name"));
			}
			/*Если есть доп-картинка начало*/
		}

		/*Если есть основная картинка начало*/
		if ($(elem).data('image')) {
			$('.product__form .preview img').prop('src', $(elem).data('image'));
			$('.product__form .preview .image').prop('href', $(elem).data('imagebig'));
		}
		/*Если есть основная картинка начало*/

		/*Если назначены группы переключений начало*/
		if ($(elem).data('group-radio')) {
			let strRadio = $(elem).data('group-radio');
			let group_radio = (typeof strRadio == 'number' ? [strRadio] : strRadio.split(','));
			$.each(group_radio, function (k, v) {
				if ($(elem).prop("checked")) {
					$("[data-group-radio*=" + v + "]", prop_parent).not(elem).prop('checked', false);
				}
			})
		}
		/*Если назначены группы переключений конец*/

		$("input, select", form_parent).each(function (i, k) {
			/*Если включена доп. форма начало*/
			let form = $("." + $(k).data('form-action'));
			let hide = $(".hide-" + $(k).data('form-action'));
			let k_prop_parent = $(k).parents('.values');

			if ($(k).prop("checked") && !$(k).prop("disabled")) {
				$(k).parent().addClass("selected");

				if ($(k).data('form-action')) {
					enableForm[$(k).data('form-action')] = true;

					form.show();
					hide.hide();
					$('input, select', form).prop('disabled', false);
					$('input, select', hide).prop('disabled', true);
				}

				if ($(k).data('group-disable')) {
					disableProp = disableProp.concat($(k).data('group-disable').split(","));
				}

			} else if ((enableForm[$(k).data('form-action')] != true || enableForm[$(k).data('form-action')] == undefined)) {

				$(k).parent().removeClass("selected");

				if ($(k).data('form-action')) {
					form.hide();
					hide.show();
					$('input, select', form).prop('disabled', true);
					$('input, select', hide).prop('disabled', false);
				}
			}
			/*Если включена доп. форма начало*/
		});

		if ($(".prop-uslugi", form_parent).length) {
			$('input, select').each(function (i, k) {
				let k_prop_parent = $(k).parents('.values');
				let k_root_prop_parent = k_prop_parent.parents('.prop');
				if (k_root_prop_parent.length) {  //&& $(elem).attr("name") !=  && $(elem).attr("name") != "PATINA" && $(elem).attr("name") != "GLASS" && $(elem).attr("name") != "MILLING"
					if (
						(
							(
								isseparate
								&&
								(
									(
										$(k).data('separated') == undefined
										||
										$(k).data('separated') == 0
									)
									&&
									(
										(
											k_prop_parent.data('align')
											&&
											(
												(
													(
														!$(k).data('relations-width')
													)
													||
													(
														// Если self.raspil или ключ отсутствуют, подставляем 0
														eval($(k).data('relations-width').split('#W#').join(((self.raspil && self.raspil[k_prop_parent.data('align')]) ?? 0)))
													)
												)
												&&
												(
													(
														!$(k).data('relations-depth')
													)
													||
													(
														$('#size_edit_depth_input').length
														&&
														eval($(k).data('relations-depth').split('#D#').join($('#size_edit_depth_input').val()))
													)
												)
											)
										)
										||
										(
											!k_prop_parent.data('align')
										)
									)
								)
							)
							||
							(
								!isseparate
								&&
								!(
									k_prop_parent.data('align')
									&&
									$(k).data('separated') == 0
								)
								&&
								(
									(
										!$(k).data('relations-depth')
									)
									||
									(
										$('#size_edit_depth_input').length
										&&
										eval($(k).data('relations-depth').split('#D#').join($('#size_edit_depth_input').val()))
									)
								)
							)
						)
						&&
						(
							(!$(k).data('group'))
							||
							($(k).data('group') && disableProp.indexOf($(k).data('group')) == -1)
						)
					) {
						$(k).prop('disabled', false).parents('li').show();

						if ($(k).data('class') && $(k).prop("checked")) {
							$($(k_prop_parent).data('target')).addClass($(k).data('class'));
							activateWidthSetting($(k)); //активирует ширину еврозапила мама
						} else {
							$($(k_prop_parent).data('target')).removeClass($(k).data('class'));
							deactivateWidthSetting($(k)); //деактивирует ширину еврозапила мама
						}
					} else {
						$(k).prop('disabled', true).parents('li').hide();

						if ($(k).data('class')) {
							$($(k_prop_parent).data('target')).removeClass($(k).data('class'));
						}
						deactivateWidthSetting($(k)); //деактивирует ширину еврозапила мама
					}
				}
			});
		}

		//активирует ширину еврозапила мама
		function activateWidthSetting(elem) {
			if (elem.closest('.prop-uslugi').find($('input[data-parent-id="' + elem.val() + '"]')).length > 0) {
				let widthSettingElem = elem.closest('.prop-uslugi').find($('input[data-parent-id="' + elem.val() + '"]'));
				widthSettingElem.prop('disabled', false).parents('.item-width-setting').show();
				widthSettingElem.addClass('active');

				let defaultWidth = 600,
					step = 10,
					anotherShow = 0,
					anotherID = false,
					raspilKey = elem.closest('.values').data('align') > 0 ? elem.closest('.values').data('align') : false, //ключ распила если он присутствует
					idInput = raspilKey - 1,
					valInp = widthSettingElem.val(),
					freeSpace = raspilKey ? $('.path-width[data-id="' + idInput + '"]').val() : $('input[name="width"]').val(); //свободное пространство

				valInp = parseInt(valInp);
				freeSpace = parseInt(freeSpace);

				if (valInp <= step || isNaN(valInp)) valInp = step;

				//ищем соседний элемент еврозапила если он есть
				widthSettingElem.closest('.list-width-setting').find('input').each(function () {
					if (
						$(this).data('parent-id') != widthSettingElem.data('parent-id') &&
						$(this).prop('disabled') === false &&
						$(this).hasClass('active')
					) {
						anotherID = $(this).data('parent-id');
						anotherShow = parseInt($(this).val());
					}
				});

				freeSpace = freeSpace - anotherShow;

				if (freeSpace < valInp + step) {
					valInp = freeSpace - step;
				}

				if (valInp <= 0 && anotherID !== false) {
					valInp = step;
					anotherShow = anotherShow - step;
					if (anotherShow < step) {
						deactivateWidthSetting(elem);
						elem.prop('disabled', true).parents('li').hide();
						if (elem.data('class')) {
							$(elem.closest('.values').data('target')).removeClass(elem.data('class'));
						}
					} else {
						widthSettingElem.closest('.list-width-setting').find('input[data-parent-id="' + anotherID + '"]').val(anotherShow);
					}
				}
				widthSettingElem.val(valInp)
			}
		}

		//деактивирует ширину еврозапила мама
		function deactivateWidthSetting(elem) {
			if (elem.closest('.prop-uslugi').find($('input[data-parent-id="' + elem.val() + '"]')).length > 0) {
				let widthSettingElem = elem.closest('.prop-uslugi').find($('input[data-parent-id="' + elem.val() + '"]'));
				widthSettingElem.prop('disabled', true).parents('.item-width-setting').hide();
				widthSettingElem.removeClass('active');
			}
		}

		// проверка на опции ал рамки
		if ($('input[data-opt-specific="true"]').val()) {

			var onlyOpt = $('input[data-opt-specific="true"]');
			var onlyOptVal = onlyOpt.data('opt-fasade');
			var notWithOpt = onlyOpt.data('opt-notwith');

			if (onlyOptVal) {
				// проверяет с чем включать
				if (onlyOptVal.toString().includes(','))
					var optList = onlyOptVal.split(',');
				else
					var optList = [onlyOptVal];

				var isOptChecked = false;
				var _a = optList;

				var _f = function _f(item) {
					var input = $("input[value=\"".concat(item, "\"]"));

					if (input.prop('checked')) {
						isOptChecked = true;
					}
				};

				for (var _i = 0; _i < _a.length; _i++) {
					_f(_a[_i], _i, _a);
				}

				undefined;

				if (isOptChecked) {

					let arrGroup = [];

					onlyOpt.each(function (k, v) {

						let qwe = $(v);

						if (elem.attr('NAME') == 'OPTION[]') {
							if (elem.prop('checked') === false && elem.attr('data-opt-specific') == 'true') elem.prop('checked', true);
						} else {
							if (arrGroup.indexOf(qwe.attr('data-group-radio')) == -1) {
								arrGroup.push(qwe.attr('data-group-radio'));
								qwe.prop('checked', true);
							} else {
								qwe.prop('checked', false);
							}
						}
						qwe.parents('label').show();
					})


					/*
					onlyOpt.prop({
					  'checked': true
					}).parents('label').show();
					*/

					if (notWithOpt) {

						if (typeof (notWithOpt) == 'string') {
							var notWithList = notWithOpt.split(',');
						} else if (typeof (notWithOpt) == 'number') {
							var notWithList = [notWithOpt];
						}

						var _a2 = notWithList;

						var _f2 = function _f2(item) {
							var input = $("input[value=\"".concat(item, "\"]"));

							if (input) {
								input.prop({
									'checked': false
								}).parents('label').hide();
							}
						};

						for (var _i2 = 0; _i2 < _a2.length; _i2++) {
							_f2(_a2[_i2], _i2, _a2);
						}

						undefined;
					}
				} else {
					onlyOpt.prop({
						'checked': false
					}).parents('label').hide();

					if (notWithOpt) {

						if (typeof (notWithOpt) == 'string') {
							var _notWithList = notWithOpt.split(',');
						} else if (typeof (notWithOpt) == 'number') {
							var _notWithList = [notWithOpt];
						}

						var _a3 = _notWithList;

						var _f3 = function _f3(item) {
							var input = $("input[value=\"".concat(item, "\"]"));

							if (input) {
								input.parents('label').show();
							}
						};

						for (var _i3 = 0; _i3 < _a3.length; _i3++) {
							_f3(_a3[_i3], _i3, _a3);
						}

						undefined;
					}
				}
			}
		}

		if ($("[data-filling]", form_parent).length && $("input[name='FILLING']", form_parent).length) {
			var FillVal = $('input:checked[name="FILLING"]').val();
			$("[data-filling]", form_parent).each(function (k, fillRel) {
				if ($(fillRel).data('filling')) {
					if (
						(
							typeof $(fillRel).data('filling') == 'number'
							&&
							FillVal == $(fillRel).data('filling')
						)
						||
						(
							typeof $(fillRel).data('filling') == 'string'
							&&
							$(fillRel).data('filling').indexOf(FillVal) != -1
						)
					) {
						$(fillRel).prop({ disabled: false }).parents('li').show();
					} else {
						$(fillRel).prop({ disabled: true }).parents('li').hide();
					}
				}
			});
		}

		$("input[data-relations]", form_parent).each(function (i, k) {
			self.catalogControlRelation(propsShow, k);
		});

		self.catalogControlConditions();

		$.each(propsShow, function (k, v) {

			let rel = $('.prop-' + k, form_parent);

			let relEnable = rel.data('enable');

			if (relEnable == false) {
				if (v) {
					rel.removeClass('disable');

					if (v === true) {
						$('input, select', rel).prop('disabled', false).parents('li').show();
					} else if (v == 'hide') {
						rel.addClass('disable');
						$('input, select', rel).prop({ 'disabled': true, "checked": false }).parent('label').removeClass('selected');
					} else {
						var enablePropVals = v.toString().split(',');
						$('input, select', rel).each(function () {
							//Отключает инпут
							if (
								$("input[name='SELECTFASADE']:checked").val() >= 1 &&
								k == 'fasade_type'
							) {
								let fasadeNumber = $("input[name='SELECTFASADE']:checked").val();
								let fasadeType = $("input[name='TYPE_FASADE" + fasadeNumber + "']").val();
								let arrFasadeType = fasadeType.toString().split(',');

								if (
									enablePropVals.indexOf($(this).val()) == -1 ||
									arrFasadeType.indexOf($(this).val()) == -1
								) {
									$(this).prop({
										'disabled': true,
										"checked": false
									}).parent('label').removeClass('selected').parents('li').hide();
								} else {
									$(this).prop('disabled', false).parents('li').show();
								}
							} else {
								if (enablePropVals.indexOf($(this).val()) == -1) {
									$(this).prop({
										'disabled': true,
										"checked": false
									}).parent('label').removeClass('selected').parents('li').hide();
								} else {
									//Включает инпут
									$(this).prop('disabled', false).parents('li').show();
								}
							}


						});
					}

					let first = $('input:enabled', rel).not($('[aria-label="Search"]'))[0];
					if (!$('input:checked:enabled', rel).length && first) {
						$(first).prop("checked", true).parent('label').addClass('selected');
						recall = true;
					}
				} else {
					rel.addClass('disable');
					$('input, select', rel).prop({ 'disabled': true, "checked": false }).parent('label').removeClass('selected');
				}
			}
		});

		if (
			$('input:checked[data-no_fasade=1]').length
		) {
			if ($('input:checked[name=FACADE]').data('type') != 'no_fasade') {
				$("input[name=FACADE][data-type=no_fasade]").prop({ 'checked': true });
			}

			$('.prop-facades').addClass('disable');
		} else {
			$('.prop-facades').removeClass('disable');
		}

		$('.selectpicker').selectpicker('refresh');

		if (recall)
			$(elem).trigger('change');

		if ($("input[name='SIZEEDITJOINDEPTH']", form_parent).length > 0) {
			let joinDepth = $("input[name='SIZEEDITJOINDEPTH']", form_parent),
				widthFrame = $("input[name='SIZEEDITWIDTH']", form_parent),
				min = parseInt(joinDepth.attr('data-min')),
				max = parseInt(joinDepth.attr('data-max')),
				joinDepthVal = parseInt(joinDepth.val()),
				detected = false,
				typeFasade = $('input[name="FACADE"]:checked').attr('data-type');


			for (var changeMax = max; changeMax >= min; changeMax--) {
				detected = self.expressionsReplace(joinDepth.attr('data-incl-cond'), { '#X#': widthFrame.val(), '#SIZEEDITJOINDEPTH#': changeMax });
				detected = eval(detected);
				if (detected) break;
			}


			if (typeFasade == 'no_fasade') {
				joinDepth.prop('disabled', true);
				//joinDepth.closest('.prop-resize').hide();
			}

			if (detected) {

				let objSld = { 'detected': false }

				if (changeMax <= max) {
					objSld['max'] = changeMax;
					objSld.detected = true
				}

				if (changeMax < joinDepthVal) {
					joinDepthVal = changeMax;
					objSld['value'] = changeMax;
					joinDepth.val(changeMax);
					objSld.detected = true
				}

				let condition = self.expressionsReplace($("input[name='condition']", form_parent).attr('width'), { '#X#': widthFrame.val(), '#SIZEEDITJOINDEPTH#': joinDepthVal });
				condition = eval(condition);
				$(".fasade_width", form_parent).text(condition)


				if (objSld.detected) {
					var slideElement = $("#size_edit_joindepth_slider");
					slideElement.slider(objSld);
				}

				joinDepth.prop('disabled', false);
				joinDepth.closest('.prop-resize').show();

			} else {
				joinDepth.prop('disabled', true);
				joinDepth.closest('.prop-resize').hide();
			}

		}

		if ($("input[name='MECHANISM']", form_parent).length > 0) {
			//let q = self.getElementSize('.catalog-element-form');
			//console.log(q)
			//console.log($("input[name='MECHANISM']", form_parent));
			var activeFasade = $('input[name="FACADE"]:checked');
			var typeFasade = $('input[name="FACADE"]:checked').attr('data-type');
			var mechanismList = $("input[name='MECHANISM']", form_parent);

			if (typeFasade == 'no_fasade') {
				self.deactivateMechanism(mechanismList);
			} else {
				self.controlMechanism(activeFasade, mechanismList);
			}
		}

		if ($("input[name='FACADE']", form_parent).length > 0 && $("input[name='IGNORE_SIZE']", form_parent).val() != '1') {

			//$('input[name="height"]').val()

			let width = $("input[name='SIZEEDITWIDTH']").val();
			let height = $("input[name='SIZEEDITHEIGHT']").val();

			if (width === undefined) {
				width = $('input[name="width"]').val();
				width = parseInt(width);
			}

			if (height === undefined) {
				height = $('input[name="height"]').val();
				height = parseInt(height);
			}

			if ($('input[name="condition"]').attr('width') != '') {
				let formulaWidth = $('input[name="condition"]').attr('width');
				if ($('input[name="SIZEEDITJOINDEPTH"]').val()) {
					formulaWidth = formulaWidth.split('#SIZEEDITJOINDEPTH#').join($('input[name="SIZEEDITJOINDEPTH"]').val());
				}
				if ($('input[name="depth"]').val()) {
					formulaWidth = formulaWidth.split('#Z#').join($('input[name="depth"]').val());
				}
				formulaWidth = formulaWidth.split('#X#').join(width);

				width = eval(formulaWidth);
				width = parseInt(width);
			}

			if ($('input[name="condition"]').attr('height') != '') {
				height = eval($('input[name="condition"]').attr('height').split('#Y#').join(height));
				height = parseInt(height);
			}

			var defaultElem = $('.prop-facades input:first'),
				selectedElem = $('.prop-facades input[type="radio"]:checked'),
				selectedElemWidth = parseInt(selectedElem.attr('max-width')),
				selectedElemHeight = parseInt(selectedElem.attr('max-height')),
				selectedElemMinHeight = parseInt(selectedElem.attr('min-height')),
				selectedElemMinWidth = parseInt(selectedElem.attr('min-width'));


			if (
				(
					selectedElemWidth < width || selectedElemHeight < height ||
					selectedElemMinHeight === undefined || selectedElemMinWidth === undefined
				) ||
				(
					selectedElemWidth < width || selectedElemHeight < height ||
					selectedElemMinHeight > width || selectedElemMinWidth > height
				)
			) {
				defaultElem.prop("checked", true);
				defaultElem.closest('label').addClass('selected');
				selectedElem.closest('label').removeClass('selected');
				//$('.prop.prop-resize[data-type="' + type + '"]').append('<p style="color:red;" class="error">Цвет фасада был сброшен. Несоответствует размерам.</p>');
				//setTimeout(function () {
				//$('.prop.prop-resize[data-type="' + type + '"] .error').remove();
				//}, 4000);
			}

			$('.prop-facades .group-values input').each(function () {
				var sizeCheckWidth = $(this).attr('max-width'),
					sizeCheckHeight = $(this).attr('max-height'),
					sizeCheckMinHeight = $(this).attr('min-height'),
					sizeCheckMinWidth = $(this).attr('min-width');

				if (sizeCheckWidth !== undefined && sizeCheckHeight !== undefined) {
					sizeCheckWidth = parseInt(sizeCheckWidth);
					sizeCheckHeight = parseInt(sizeCheckHeight);

					if (
						(
							sizeCheckWidth < width ||
							sizeCheckHeight < height &&
							sizeCheckMinHeight === undefined &&
							sizeCheckMinHeight === undefined
						) ||
						(
							sizeCheckWidth < width ||
							sizeCheckHeight < height ||
							sizeCheckMinWidth > width ||
							sizeCheckMinHeight > height
						)
					) {
						$(this).closest('li').addClass('hiden-fasade');
						$(this).addClass('err');
						$(this).prop('disabled', true);
					} else {
						$(this).closest('li').removeClass('hiden-fasade');
						$(this).removeClass('err');
						$(this).prop('disabled', false);
					}
				}
			});
			$('.prop-facades .group').each(function () {
				if ($(this).find('input').length == $(this).find('input.err').length) {
					$(this).hide();
				} else {
					$(this).show();
				}
			});

		}

		const sawPropil = 20;

		if ($("#raspilVert")) {
			const value = $("input[name='SIZEEDITWIDTH']", form_parent).val() / 2 - sawPropil / 2;
			if (value > 0) {
				$("#raspilVert").text('(' + String(value) + ' + ' + String(value) + ')');
			}
		}

		if ($("#raspilHor")) {
			const value = $("input[name='SIZEEDITHEIGHT']", form_parent).val() / 2 - sawPropil / 2;
			if (value > 0) {
				$("#raspilHor").text('(' + String(value) + ' + ' + String(value) + ')');
			}
		}
		if ($("input[name='SELECTFASADE']:checked").val() >= 1) {

			let numberElem = $("input[name='SELECTFASADE']:checked").val();

			let arrType = ['FACADE', 'MILLING', 'PALETTE', 'FASADETYPE', 'PATINA', 'GLASS'];

			let name = {
				FACADE: 'Цвет фасада',
				MILLING: 'Фрезеровка',
				PALETTE: 'Цвет палитры',
				FASADETYPE: 'Тип фасада',
				PATINA: 'Патина',
				GLASS: 'Стекло',
			}

			let text = '';

			for (let type in arrType) {

				if (arrType[type] == 'PALETTE') {
					var typeVal = $("select:enabled[name='" + arrType[type] + "'] option:selected").val();
				} else {
					var typeVal = $("input[name='" + arrType[type] + "']:checked").val();
				}

				let codeElem = "CUSTOM_" + arrType[type] + numberElem;

				if (typeVal !== undefined) {
					$("input[name='" + codeElem + "']").val(typeVal)
					if (arrType[type] == 'PALETTE') {
						text += name[arrType[type]] + ': ' + $("select:enabled[name='" + arrType[type] + "'] option:selected").text() + '<br>';
					} else {
						text += name[arrType[type]] + ': ' + $("input[name='" + arrType[type] + "']:checked").closest('.selected').find('.value-title').text() + '<br>';
					}

				} else {
					$("input[name='" + codeElem + "']").val('')
				}
			}

			$("#selectFasade" + numberElem + "").find('.description').html(text)

		}
	}

	this.deactivateMechanism = function (mechanismList) {
		mechanismList.each(function () {
			$(this).prop("checked", false);
			$(this).closest('li').hide();
		});
	};

	this.controlMechanism = function (activeFasade, mechanismList) {
		var activeMilling = $('input[name="MILLING"]:checked');
		var density = parseFloat(activeFasade.attr('density')),
			depth = parseFloat(activeFasade.attr('depth')),
			weightFasade = parseFloat(activeFasade.attr('weight')),
			allWidth = 0,
			allHeight = 0,
			allWeight = 0;

		if (activeMilling.length > 0 && activeMilling.attr('weight') !== undefined) {
			weightFasade = parseFloat(activeMilling.attr('weight'))
		}

		if (isNaN(weightFasade)) {
			self.deactivateMechanism(mechanismList);
			return false;
		}

		var objSizeFrame = self.getElementSize('.catalog-element-form'),
			widthFrame = parseFloat(objSizeFrame.width),
			heightFrame = parseFloat(objSizeFrame.height);

		if ($('input[name="conditionnew"]').length > 0) {


			$('input[name="conditionnew"]').each(function () {
				var conditionWidth = $(this).attr('width'),
					conditionHeight = $(this).attr('height'),
					objAxe = {
						'#X#': widthFrame,
						'#Y#': heightFrame
					};

				let sumCondWidth = self.expressionsReplace(conditionWidth, objAxe);
				sumCondWidth = eval(sumCondWidth);
				let sumCondHeight = self.expressionsReplace(conditionHeight, objAxe);
				sumCondHeight = eval(sumCondHeight);
				allHeight += sumCondHeight;
				allWeight += sumCondWidth * sumCondHeight / 1000000 * weightFasade;
			})
		}

		if (allWeight <= 0) {
			self.deactivateMechanism(mechanismList);
			return false;
		}

		allWeight = parseFloat(allWeight.toFixed(2));
		var objSectionMech = {};
		var idsMech = {}
		mechanismList.each(function () {
			if ($(this).attr('data-cond') !== undefined) {
				var arrConditions = $(this).attr('data-cond').split(','),
					typeMech = $(this).attr('data-type-mech'),
					sectionMech = $(this).attr('data-section'),
					cond = [],
					id = $(this).val();

				for (var q in arrConditions) {
					cond[q] = arrConditions[q].split('_');

					for (var i in cond[q]) {
						cond[q][i] = parseFloat(cond[q][i]);
					}

					if (allHeight >= cond[q][0] && allHeight <= cond[q][1] && allWeight >= cond[q][2] && allWeight <= cond[q][3]) {

						if (objSectionMech[sectionMech] !== undefined) {
							if (objSectionMech[sectionMech] != typeMech) {
								continue;
							}
						}

						idsMech[id] = true;
						objSectionMech[sectionMech] = typeMech;
					}
				}
			}
		});

		mechanismList.each(function () {
			var typeMech = $(this).attr('data-type-mech'),
				sectionMech = $(this).attr('data-section'),
				id = $(this).val();

			if (idsMech[id] === true) {
				$(this).closest('li').show();
			} else {
				$(this).closest('li').hide();
				$(this).prop("checked", false);
			}
		});
	};

	this.catalogInitEvent = function (ElementGetPriceFunc, addToBasketFunc) {

		// Глобальный флаг, чтобы регистрировать document-обработчики только один раз на все переходы
		if (typeof window !== 'undefined') {
			if (window.__catalogHandlersBound) {
				self.productIsInit = true;
				return;
			}
			window.__catalogHandlersBound = true;
		}

		$(document).on("change", "input[name='SELECTFASADE']", function () {
			if ($("input[name='SELECTFASADE']:checked").val() >= 1) {

				let n = $("input[name='SELECTFASADE']:checked").val();

				//$('.fasadeNumber img').hide();
				//$("input[name='SELECTFASADE']:checked").siblings('img').show();

				let arrType = ['FACADE', 'MILLING', 'FASADETYPE', 'PALETTE', 'PATINA', 'GLASS'];

				for (let type in arrType) {
					let codeElem = "CUSTOM_" + arrType[type] + n;

					if ($("input[name='" + codeElem + "']").val() == '') {
						$("input[value='" + $("input[name='" + codeElem + "']").val() + "']").prop("checked", false);
					} else {
						$("input[value='" + $("input[name='" + codeElem + "']").val() + "']").prop("checked", true);
					}
				}

				for (let type in arrType) {
					let codeElem = "CUSTOM_" + arrType[type] + n;
					self.doChangeProps($("input[value='" + $("input[name='" + codeElem + "']").val() + "']"));
				}
			}
		})


		$(document).on("change", ".prop-facades input, .prop-colors input, .prop-leg_type input, .prop-milling input, .prop-glass input, .prop-hem input, .prop-fasadesize input, .prop-uslugi input, .prop-filling input, .prop-milling input, .prop-resize input, .prop-profile input, .prop-handlecolor input, .prop-fasadealign input, .prop-patinacolor input, .prop-tabletop_type input, .prop-option input, .prop-type_showcase input, .prop-fasade_type input, .prop-palette-wrap select", function ()		//Выбор фасада или цвета
		{
			var elem = $(this);

			self.doChangeProps(elem);

			ElementGetPriceFunc($(elem).parentsUntil(".product__wrapper").parent());
		}).on("change", ".prop-group input", function () {
			var elem = $(this);
			$('.group-consist, .basket-label').removeClass('active');
			$('.group-consist' + elem.data("id") + ', .basket-label' + elem.data("id")).addClass('active');
			ElementGetPriceFunc($(elem).parentsUntil(".product__wrapper").parent());
		}).on('click', '.facade-collaps', function (e) {
			var collapsId = $(this).data('href');
			var parent = $(collapsId).parents('.group');

			parent.toggleClass('collapse_open');

		}).on("change", ".prop-size .values input, .prop-thickness .values input", function () { //Выбор размеров и толщины в карточке товара
			var elem = $(this);

			if (elem.prop("checked")) {
				elem.parent().addClass('active');

				$(elem).parentsUntil(".values").parent().find("input:checked").each(function () {
					if ($(this).val() != $(elem).val()) {
						$(this).prop("checked", false);
						$(this).parent().removeClass('active');
					}
				});

				ElementGetPriceFunc($(elem).parentsUntil(".product__wrapper").parent());
			}
			else {
				$(elem).prop("checked", true);
			}
			// Снимаем возможные предыдущие обработчики, чтобы избежать дублирования добавления в корзину
		}).off('click', ".element .add-to-basket .to-basket, .product__cart-button")
			.on("click", ".element .add-to-basket .to-basket, .product__cart-button", function (e, w) {
				addToBasketFunc(e);
				return false;
			}).on("click", ".windowinfo-btn", function (e, w) {
				return false;
			});

		self.productIsInit = true;
	}

	this.catalogControlRelation = function (propsShow, k) {

		let relations = $(k).data('relations') ? $(k).data('relations').split(',') : [];

		$.each(relations, function (i, v) {
			if (propsShow[v] == undefined)
				propsShow[v] = false;

			if ($(k).prop('checked')) {
				propsShow[v] = ($(k).data(v) == undefined) ? true : (($(k).data(v) == false || $(k).prop('disabled')) ? false : $(k).data(v));
			}
		});

	}

	this.catalogControlConditions = function () {
		$("[data-conditions]").each(function (i, el) {
			if ($(el).data('conditions').length) {
				var form = $(el).parents('form');
				var size = self.getElementSize(form);

				var condition = {
					"#X#": size.width,
					"#Y#": size.height,
					"#Z#": size.depth,
				}

				if (!eval(self.expressionsReplace($(el).data('conditions'), condition))) {
					$(el).prop('disabled', true);
					$(el).prop("checked", false);
					$(el).parents('li').hide();
				} else {
					$(el).prop('disabled', false);
					$(el).parents('li').show();
				}

				if (
					!$(el).parents('.prop').find('input:enabled:checked').length &&
					!$(el).parents('.prop-option').length
				) {
					var act = $(el).parents('.prop').find('input:enabled').first();
					act.prop("checked", true).trigger('change');
					act.parent().addClass('selected');
				}
			}
		});
	}

	this.getElementSize = function (form) {
		return {
			'width': ($('[name=SIZEEDITWIDTH]', form).val() || $('[name=width]', form).val()),
			'height': ($('[name=SIZEEDITHEIGHT]', form).val() || $('[name=height]', form).val()),
			'depth': ($('[name=SIZEEDITDEPTH]', form).val() || $('[name=depth]', form).val()),
		}
	}

	this.expressionsReplace = function (obj, expressions) {
		$.each(expressions, function (k, v) {
			obj = obj.split(k).join(v);
		});
		return obj;
	}

	this.catalogInitResizeProp = function () {
		$('.prop-resize').each(function (i, e) {
			var type = $(e).data('type');

			var elementBtn = $("#size_edit_" + type);
			var input = $("input", e);

			if (elementBtn.length != 0) {
				elementBtn.buttonset();
			} else {
				var slideElement = $("#size_edit_" + type + "_slider");
				var min = slideElement.data('min');
				var max = slideElement.data('max');
				var step = slideElement.data('step') ? slideElement.data('step') : 1;
				var value = input.val();

				var spinner = input.spinner({
					step: step,
					min: min,
					max: max,
					change: function () {
						var v = self.catalogControlSize($(this).val(), min, max);
						slideElement.slider({ value: v });
					},
					stop: function () {
						var v = self.catalogControlSize($(this).val(), min, max);
						slideElement.slider({ value: v });
						input.val(v).trigger('change');
						self.catalogControlConditions();
						if (type == 'depth') {
							$("#separate_table .table_wrap").height((200 / 600) * v);
							$("#one_table .table_wrap").height((200 / 600) * v);
							$('#separate_table .onesize .onesize-depth').html(v);
							$('#one_table .table_wrap .onesize-depth').html(v);
						}
					}
				});

				var val_span = $('#size_edit_' + type + '_slider_wrap span.label');
				slideElement.slider({
					min: min,
					max: max,
					step: step,
					range: "min",
					value: value,
					create: function () {
						val_span.text(value);

						if (type == 'depth') {
							$("#separate_table .table_wrap").height((200 / 600) * value);
							$("#one_table .table_wrap").height((200 / 600) * value);

							$('#separate_table .onesize .onesize-depth').html(value);
							$('#one_table .table_wrap .onesize-depth').html(value);
						}
					},
					slide: function (event, ui) {
						val_span.text(ui.value).show();

						if (type == 'depth') {
							$("#separate_table .table_wrap").height((200 / 600) * ui.value);
							$("#one_table .table_wrap").height((200 / 600) * ui.value);

							$('#separate_table .onesize .onesize-depth').html(ui.value);
							$('#one_table .table_wrap .onesize-depth').html(ui.value);

						}
					},
					stop: function (event, ui) {
						val_span.text(ui.value).hide();
						input.val(self.catalogControlSize(ui.value, min, max)).trigger('change');
						self.catalogControlConditions();
						//self.controlSizeFasade(false, ui.value, type);
					}
				});
			}
		});
	}

	this.controlSizeFasade = function (init = false, value = false, type = false) {

		let height, width;

		if (type == 'height' || type == 'width' && init == false) {

			if (type == 'width') {
				width = value;
				height = parseInt($('#size_edit_height_input').val());
			} else {
				height = value;
				width = parseInt($('#size_edit_width_input').val());
			}

			if (isNaN(height)) {
				height = parseInt($('input[name="height"]').val());
			}
			if (isNaN(width)) {
				width = parseInt($('input[name="width"]').val());
			}

			if ($('input[name="condition"]').attr('width') != '') {
				let formulaWidth = $('input[name="condition"]').attr('width');
				if ($('input[name="SIZEEDITJOINDEPTH"]').val()) {
					formulaWidth = formulaWidth.split('#SIZEEDITJOINDEPTH#').join($('input[name="SIZEEDITJOINDEPTH"]').val());
				}
				formulaWidth = formulaWidth.split('#X#').join(width);

				width = eval(formulaWidth);
			}

			if ($('input[name="condition"]').attr('height') != '') {
				height = eval($('input[name="condition"]').attr('height').split('#Y#').join(height));
			}

			var defaultElem = $('.prop-facades input:first'),
				selectedElem = $('.prop-facades input[type="radio"]:checked'),
				selectedElemWidth = parseInt(selectedElem.attr('max-width')),
				selectedElemHeight = parseInt(selectedElem.attr('max-height')),
				selectedElemMinHeight = parseInt(selectedElem.attr('min-height')),
				selectedElemMinWidth = parseInt(selectedElem.attr('min-width'));


			if (
				(
					selectedElemWidth < width || selectedElemHeight < height ||
					selectedElemMinHeight === undefined || selectedElemMinWidth === undefined
				) ||
				(
					selectedElemWidth < width || selectedElemHeight < height ||
					selectedElemMinHeight > width || selectedElemMinWidth > height
				)
			) {
				defaultElem.prop("checked", true);
				defaultElem.closest('label').addClass('selected');
				selectedElem.closest('label').removeClass('selected');

				self.catalogInitElementProps($(".main__product .product__wrapper"), self.catalogElementGetPrice);

				$('.prop.prop-resize[data-type="' + type + '"]').append('<p style="color:red;" class="error">Цвет фасада был сброшен. Несоответствует размерам.</p>');

				setTimeout(function () {
					$('.prop.prop-resize[data-type="' + type + '"] .error').remove();
				}, 4000);
			}


			$('.prop-facades .group-values input').each(function () {
				var sizeCheckWidth = $(this).attr('max-width'),
					sizeCheckHeight = $(this).attr('max-height'),
					sizeCheckMinHeight = $(this).attr('min-height'),
					sizeCheckMinWidth = $(this).attr('min-width');

				if (sizeCheckWidth !== undefined && sizeCheckHeight !== undefined) {
					sizeCheckWidth = parseInt(sizeCheckWidth);
					sizeCheckHeight = parseInt(sizeCheckHeight);

					if (sizeCheckWidth < width || sizeCheckHeight < height) {
						$(this).closest('li').addClass('hiden-fasade');
						$(this).addClass('err');
					} else {
						$(this).closest('li').removeClass('hiden-fasade');
						$(this).removeClass('err');
					}
				}

				if (sizeCheckMinHeight !== undefined && sizeCheckMinWidth !== undefined) {
					sizeCheckMinWidth = parseInt(sizeCheckMinWidth);
					sizeCheckMinHeight = parseInt(sizeCheckMinHeight);

					if (sizeCheckMinWidth > width || sizeCheckMinHeight > height) {
						$(this).closest('li').addClass('hiden-fasade');
						$(this).addClass('err');
					} else {
						$(this).closest('li').removeClass('hiden-fasade');
						$(this).removeClass('err');
					}
				}

			});

			$('.prop-facades .group').each(function () {
				if ($(this).find('input').length == $(this).find('input.err').length) {
					$(this).hide();
				} else {
					$(this).show();
				}
			});


		} else if (init) {
			width = parseInt($('#size_edit_width_input').val());
			height = parseInt($('#size_edit_height_input').val());

			if (isNaN(height)) {
				height = parseInt($('input[name="height"]').val());
			}
			if (isNaN(width)) {
				width = parseInt($('input[name="width"]').val());
			}

			if ($('input[name="condition"]').attr('width') != '' && $('input[name="condition"]').attr('width') != undefined) {
				let formulaWidth = $('input[name="condition"]').attr('width');
				if ($('input[name="SIZEEDITJOINDEPTH"]').val()) {
					formulaWidth = formulaWidth.split('#SIZEEDITJOINDEPTH#').join($('input[name="SIZEEDITJOINDEPTH"]').val());
				}
				formulaWidth = formulaWidth.split('#X#').join(width);

				width = eval(formulaWidth);
			}

			if ($('input[name="condition"]').attr('height') != '' && $('input[name="condition"]').attr('height') != undefined) {
				height = eval($('input[name="condition"]').attr('height').split('#Y#').join(height));
			}

			$('.prop-facades .group-values input').each(function () {
				var sizeCheckWidth = $(this).attr('max-width'),
					sizeCheckHeight = $(this).attr('max-height'),
					sizeCheckMinHeight = $(this).attr('min-height'),
					sizeCheckMinWidth = $(this).attr('min-width');

				if (sizeCheckWidth !== undefined && sizeCheckHeight !== undefined) {
					sizeCheckWidth = parseInt(sizeCheckWidth);
					sizeCheckHeight = parseInt(sizeCheckHeight);

					if (sizeCheckWidth < width || sizeCheckHeight < height) {
						$(this).closest('li').addClass('hiden-fasade');
						$(this).addClass('err');
					} else {
						$(this).closest('li').removeClass('hiden-fasade');
						$(this).removeClass('err');
					}
				}

				if (sizeCheckMinHeight !== undefined && sizeCheckMinWidth !== undefined) {
					sizeCheckMinWidth = parseInt(sizeCheckMinWidth);
					sizeCheckMinHeight = parseInt(sizeCheckMinHeight);

					if (sizeCheckMinWidth > width || sizeCheckMinHeight > height) {
						$(this).closest('li').addClass('hiden-fasade');
						$(this).addClass('err');
					} else {
						$(this).closest('li').removeClass('hiden-fasade');
						$(this).removeClass('err');
					}
				}

			});

			$('.prop-facades .group').each(function () {
				if ($(this).find('input').length == $(this).find('input.err').length) {
					$(this).hide();
				} else {
					$(this).show();
				}
			});
		}
	}

	this.catalogControlSize = function (value, min, max) {
		return (value > max) ? max : (value < min) ? min : value;
	}

	this.catalogInitResize = function (parent, callback) {
		var callback = callback || function () { };
		if ($('#sizeeditopt').length) {
			$('.prop-resize input').prop('disabled', true);

			$('#sizeeditopt').on('change', function (e) {
				if ($(this).prop('checked')) {
					$('.prop-resize input').prop('disabled', false);
					$('.prop-wrap-sizeoptional').removeClass('disable').show();
					self.catalogInitResizeProp();
				} else {
					$('.prop-resize input').prop('disabled', true);
					$('.prop-wrap-sizeoptional').addClass('disable').hide();
				}

				callback(parent);
			});
		} else {
			self.catalogInitResizeProp();
		}
	}


	this.catalogElementGetPrice = function (elem) {
		clearTimeout(self.getPriceTimer);

		document.querySelector('.product-details__back-page').disabled = true;
		document.querySelector('.product__cart-button').disabled = true;


		self.getPriceTimer = setTimeout(function () {
			const form = document.querySelector(".product__form");
			if (!form) return;

			const formData = new FormData(form);
			const urlEncodedData = new URLSearchParams();
			for (const [key, value] of formData) {
				urlEncodedData.append(key, value);
			}

			fetch(apiPath + "/API/catalog.element.getprice.php", {
				method: "POST",
				body: urlEncodedData
			})
				.then(response => response.text())
				.then(msg => {

					// === Извлекаем DOM-элемент из jQuery-объекта или используем напрямую ===
					const container = elem[0] || elem; // ← ключевая строка: если elem — jQuery, берём elem[0]

					const priceNum = parseFloat(msg.replace(' руб', '').replace(/\s/g, ''));

					const priceTextEl = container.querySelector(".product__price > .product__price-text");
					const addToBasketPriceEl = container.querySelector(".props .add-to-basket .price");
					if (priceTextEl) priceTextEl.innerHTML = msg;
					if (addToBasketPriceEl) addToBasketPriceEl.innerHTML = msg;

					const notDiscountInput = form.querySelector('input[name="NOT_DISCOUNT"]');
					if (notDiscountInput) {
						const notDiscount = parseFloat(notDiscountInput.value);
						if (!isNaN(notDiscount)) {
							const percent = 2 - notDiscount;
							const oldPrice = (priceNum / percent).toFixed();
							const formattedOldPrice = Number(oldPrice).toLocaleString('ru-RU') + ' руб';

							const notDiscountEl = container.querySelector(".product__price > .product__price-notdiscount");
							if (notDiscountEl) {
								notDiscountEl.innerHTML = formattedOldPrice;
							}
						}
					}
				})
				.catch(error => {
					console.error("Ошибка при получении цены:", error);
				}).finally(() => {
					document.querySelector('.product-details__back-page').disabled = false;
					document.querySelector('.product__cart-button').disabled = false;
				});
		}, 300);
	};

	this.catalogGetElement = function () {
		var data = { ID: $(this).attr("_id") };
		if ($(this).prop("checked")) {
			data.INSTOCK = true;
		}

		$.ajax({
			type: "POST",
			async: true,
			url: apiPath + "/API/catalog.element.popup.php",
			data: data
		}).done(function (msg) {
			$(".popup-wrap").html(msg);
			$(".popup-wrap").fadeIn(100);

			//let posTop = $(document).scrollTop() * (100/70) + 90;
			//$(".popup-wrap").css("height", '100vh');
			//$(".popup-window-catalog .product__wrapper").css("top", posTop);

			$('body').css('overflow', 'hidden');

			$(document).off('mouseup.catalogPopupClose').on('mouseup.catalogPopupClose', function (e) {
				var container = $(".popup-window-catalog .product__wrapper");
				if (container.has(e.target).length === 0) {
					$(".popup-wrap").hide();
					$(".popup-wrap").empty();
					$('body').css('overflow', 'visible');
				}
			});

			self.catalogInitProduct($(".popup-window-catalog .product__wrapper"), self.catalogElementGetPrice, self.catalogAddToBasket);
		});
		return false;
	}

	this.catalogShowBasketMin = function () {
		var el = $('.basket-min');
		$.ajax({
			type: "GET",
			async: true,
			url: apiPath + "/API/basket.basket.min.get.php"
		}).done(function (msg) {
			el.html(msg);
			el.addClass('showed');
			var pane = $(".basket-min .basket-wrap-min .basket");
			pane.jScrollPane();
			var api = pane.data('jsp');
			return api ? api.scrollToBottom(0) : false;
		});
	}

	this.catalogInitRaspil = function () {
		var callback = callback || new Function();
		var slide = $('#slider');
		var min = slide.data('min'),
			max = slide.data('max'),
			width = slide.data('width'),
			step = slide.data('step'),
			maxQuantityPath = slide.data('sepmax') ? slide.data('sepmax') : 4,
			propil = slide.data('propil') ? slide.data('propil') : 0;

		if (!slide.length) {
			return false;
		} //функция для окруления

		function myRound10(val, i) {
			return Math.round(val / i) * i;
		} //запись длинны всех распилов в основной input


		function setMainInput() {
			var arrSumWidth = [];
			$('.path-container input').each(function () {
				arrSumWidth[$(this).data('id')] = $(this).val();
			});
			$('#USLUGIraspil').val(arrSumWidth.join('*'));
		}

		//изменение ширины контейнера, который отображает распил


		function separateTable() {
			$('.path-container input').each(function () {
				var w = parseInt($(this).val()),
					id = $(this).data('id');
				$('#separate_table div[data-id-path="' + id + '"] .table_wrap').width(w / (width / 100) + '%');
				$('#separate_table div[data-id-path="' + id + '"] .onesize-width').text(w);
			});
		} //функция создает объект self.raspil для нормальной работы функции doChangeProps


		function createObj() {
			self.raspil = {};
			$('.part-raspil input').each(function () {
				var inpID = parseInt($(this).data('id')) + 1;
				self.raspil[inpID] = $(this).val();
			});

			for (var i = 1; i <= maxQuantityPath; ++i) {
				if (self.raspil[i] === undefined) {
					self.raspil[i] = 0;
				}
			}
		} //Сделано что бы button не сабмитил форму


		$('#slider .ui-slider-handle').click(function (e) {
			e.preventDefault();
		}); //запись значений (ширины) слайдера в соответсвующий input

		function displayWidth(e) {
			var $slider = $('#slider');
			var elem = e.handle,
				idElem = parseInt(e.handle.getAttribute('data-id')),
				quantityPath = $slider.find('.ui-slider-handle').length,
				valuePath = e.value;

			// if (quantityPath == 1) {
			const raspilCount = quantityPath + 1;

			const sum = 0;

			// for (let i = 0; i < raspilCount; ++i) { //считаем сумму длин
			//
			// }
			//
			// for (let i = 0; i < raspilCount; ++i) {
			//   if (idElem === i) {
			//     $(`.path-container[data-id=${i}] input`).val(valuePath);
			//   } if (idElem === i) {
			//     $(`.path-container[data-id=${i}] input`).val(width - valuePath);
			//   }
			// }

			if (quantityPath == 1) {
				$('.path-container[data-id="0"] input').val(valuePath);
				$('.path-container[data-id="1"] input').val(width - valuePath);
			}

			if (quantityPath == 2) {
				if (idElem == 0) {
					$('.path-container[data-id="0"] input').val(valuePath);
					$('.path-container[data-id="1"] input').val(e.values[1] - valuePath);
				}

				if (idElem == 1) {
					$('.path-container[data-id="1"] input').val(valuePath - e.values[0]);
					$('.path-container[data-id="2"] input').val(width - valuePath);
				}
			}

			if (quantityPath == 3) {
				if (idElem == 0) {
					$('.path-container[data-id="0"] input').val(valuePath);
					$('.path-container[data-id="1"] input').val(e.values[1] - valuePath);
				}

				if (idElem == 1) {
					$('.path-container[data-id="1"] input').val(valuePath - e.values[0]);
					$('.path-container[data-id="2"] input').val(e.values[2] - valuePath);
				}

				if (idElem == 2) {
					$('.path-container[data-id="2"] input').val(valuePath - e.values[1]);
					$('.path-container[data-id="3"] input').val(width - valuePath);
				}
			}

			separateTable();
			createObj();
			setMainInput();
			self.doChangeProps($('.prop-uslugi input'));
		}

		createObj();

		$('#slider').slider2({
			min: min,
			max: max,
			step: step,
			range: false,
			tooltips: false,
			handles: [{
				value: Math.round(width / maxQuantityPath)
			}],
			showTypeNames: true,
			mainClass: 'sleep',
			slide: function slide(e, ui) {
				displayWidth(ui);
			}
		}); //Добавление нового распила

		$('.control-part-raspil .add').click(function (e) {
			e.preventDefault();
			var $slider = $('#slider');
			var quantityPathElem = $slider.find('.ui-slider-handle'),
				quantityPathHandle = quantityPathElem.length,
				pathInputElem = $('.part-raspil input'),
				quantityPathInput = pathInputElem.length,
				idElem = quantityPathInput + 1,
				widthNewElem = 0,
				arrSumWidth = [],
				inputField;

			if ($('.control-part-raspil .delete').attr('disabled') !== undefined) {
				$('.control-part-raspil .delete').attr('disabled', false);
			}

			if (quantityPathInput <= maxQuantityPath - 1) {
				if (quantityPathInput == maxQuantityPath - 1) {
					$(this).attr('disabled', true);
				}

				if ((width - quantityPathInput * propil) / (quantityPathInput + 1) <= min) {
					$(this).attr('disabled', true);
				}

				widthNewElem = Math.round((width - quantityPathInput * propil) / (quantityPathInput + 1));

				inputField =
					'<div class="path-container" data-id="' + quantityPathInput + '">' +
					'<div>' +
					'Часть ' +
					'<span class="path-number">' + idElem + '</span>' +
					'</div>' +
					'<input   step="10" ' +
					' type="number"' +
					' data-id="' + quantityPathInput + '"' +
					' value="' + widthNewElem + '"' +
					' class="path-width"' +
					'>' +
					'<div>mm.</div>' +
					'</div>';

				var newInp = $('.part-raspil').append(inputField);
				const newArr = $('.part-raspil input');
				let sum = - propil;
				newArr.each(function (i, n) {
					arrSumWidth[$(this).data('id')] = sum;

					if (newArr.length === i + 1) {
						$(this).val(width - sum - propil);
					} else {
						sum += widthNewElem + propil;
						$(this).val(widthNewElem);
					}
				});

				changeInpS($('.part-raspil input'));

				$slider.slider2('addHandle', {
					value: arrSumWidth[0]
				});
				$slider.find('.ui-slider-handle').each(function () {
					$slider.slider2('values', $(this).data('id'), arrSumWidth[$(this).data('id')]);
				});
				createObj();
				setMainInput();
				self.doChangeProps($('.prop-uslugi input'));
				$('#separate_table div[data-id-path="' + quantityPathInput + '"]').show();
				self.catalogElementGetPrice($(".main__product .product__wrapper"));
				separateTable();
			}

			return false;
		});

		//Удаление распила
		$('.control-part-raspil .delete').click(function (e) {
			e.preventDefault();
			var $slider = $('#slider');
			var pathElem = $slider.find('.ui-slider-handle'),
				quantityPathElem = pathElem.length,
				idElem = quantityPathElem - 1,
				deleteElementCont = $('.path-container[data-id="' + quantityPathElem + '"]'),
				sum = parseInt(
					deleteElementCont.find('input').val())
					+
					parseInt($('.path-container[data-id="' + idElem + '"] input').val()
					)
					+
					propil;

			deleteElementCont.remove();
			$slider.slider2('removeHandle', idElem);
			$('.path-container[data-id="' + idElem + '"] input').val(sum);
			var allSum = 0;
			$slider.find('.ui-slider-handle').each(function () {
				var idHandle = $(this).data('id');
				allSum += parseInt($('.path-container[data-id="' + idHandle + '"] input').val());
				$slider.slider2('values', idHandle, allSum);
			});

			if ($('.path-container input').length == 2) {
				$(this).attr('disabled', true);
			}

			if ($('.path-container input').length > 2) {
				$('.control-part-raspil .add').attr('disabled', false);
			}

			createObj();
			setMainInput();
			self.catalogElementGetPrice($(".main__product .product__wrapper"));
			self.doChangeProps($('.prop-uslugi input'));
			$('#separate_table div[data-id-path="' + quantityPathElem + '"]').hide();
			separateTable();
		});

		$('.part-raspil input').keydown(function (e) {
			var keyVal = parseInt(e.key);

			if (Number.isInteger(keyVal) === false && e.key != 'Backspace') {
				return false;
			}
		});

		changeInpS($('.part-raspil input')); //изменения значений инпута вручную

		function changeInpS(elem) {
			elem.change(function (e) {
				var inputArr = $(this).closest('.part-raspil').find('input'),
					quantity = inputArr.length,
					valInput = myRound10(parseInt($(this).val()), 10),
					$slider = $('#slider'),
					widthArr = [],
					widthSum = 0,
					changeVal = 0
				propil = $slider.data('propil') ? $slider.data('propil') : 0;
				const targetID = Number($(this).data('id'));

				inputArr.each(function (i, e) {
					widthArr[i] = Number(e.value);
					widthSum += Number(e.value);
				})

				const notChange = function (id) { // возвращаем распил к исходному значению
					const messege = 'недопустимое значение ' + inputArr[targetID].value + ' Часть ' + id + ' меньше ' + min;

					toastr.warning(messege); // сообщение об ошибке
					inputArr[targetID].value = Number(inputArr[targetID].value) + changeVal;
				};

				changeVal = (width - (quantity - 1) * propil) - widthSum;

				if (inputArr[targetID].value < min) { // проверяем минимальное значение
					notChange(targetID);
				} else {
					if (maxQuantityPath) {
						inputArr.each(function (i, e) { // меняем значения инпутов

							if (i === targetID + 1 && targetID !== quantity - 1) {
								const newValue = Number(e.value) + changeVal;

								if (newValue >= min) { // проверяем инпут
									inputArr[i].value = newValue;
								} else {
									notChange(i);
								}

							} else if (i === quantity - 1 && targetID === quantity - 1) {
								const newValue = Number(inputArr[i - 1].value) + changeVal;

								if (newValue >= min) { // проверяем инпут
									inputArr[i - 1].value = newValue;
								} else {
									notChange(i);
								}

							}
						});
					}

					// else if (quantity == 2) {
					//   if (valInput < step) {
					//     valInput = step;
					//   }
					//
					//   if (valInput >= width) {
					//     valInput = width - step;
					//   }
					//
					//   if ($(this).data('id') == '0') {
					//     var r = width - valInput;
					//     $(this).val(valInput);
					//     $(this).closest('.part-raspil').find('input[data-id="1"]').val(r);
					//   }
					//
					//   if ($(this).data('id') == '1') {
					//     var _r4 = width - valInput;
					//
					//     $(this).val(valInput);
					//     $(this).closest('.part-raspil').find('input[data-id="0"]').val(_r4);
					//   }
					// }
					//
					// if (quantity == 3) {
					//   if (valInput < step) {
					//     valInput = step;
					//   }
					//
					//   if (valInput >= width) {
					//     valInput = width - step * 2;
					//   }
					//
					//   var w1 = parseInt($(this).closest('.part-raspil').find('input[data-id="0"]').val()),
					//       w2 = parseInt($(this).closest('.part-raspil').find('input[data-id="1"]').val()),
					//       w3 = parseInt($(this).closest('.part-raspil').find('input[data-id="2"]').val());
					//
					//   if ($(this).data('id') == '0') {
					//     var sum12 = width - w3;
					//
					//     if (valInput < sum12) {
					//       var _r5 = sum12 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r5);
					//     } else if (valInput > sum12) {
					//       var r1 = (width - valInput) / 2;
					//       var r2 = (width - valInput) / 2;
					//
					//       if (Number.isInteger(r1 / 10) == false) {
					//         r1 = myRound10(r1, 10);
					//         r2 = width - valInput - r1;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(r1);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(r2);
					//     }
					//   }
					//
					//   if ($(this).data('id') == '1') {
					//     var _sum = width - w1;
					//
					//     if (valInput < _sum) {
					//       var _r6 = _sum - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r6);
					//     } else if (valInput > _sum) {
					//       var _r7 = (width - valInput) / 2;
					//
					//       var _r8 = (width - valInput) / 2;
					//
					//       if (Number.isInteger(_r7 / 10) == false) {
					//         _r7 = myRound10(_r7, 10);
					//         _r8 = width - valInput - _r7;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(_r7);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r8);
					//     }
					//   }
					//
					//   if ($(this).data('id') == '2') {
					//     var _sum2 = width - w1;
					//
					//     if (valInput < _sum2) {
					//       var _r9 = _sum2 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r9);
					//     } else if (valInput > _sum2) {
					//       var _r10 = (width - valInput) / 2;
					//
					//       var _r11 = (width - valInput) / 2;
					//
					//       if (Number.isInteger(_r10 / 10) == false) {
					//         _r10 = myRound10(_r10, 10);
					//         _r11 = width - valInput - _r10;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(_r10);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r11);
					//     }
					//   }
					// }
					//
					// if (quantity == 4) {
					//   if (valInput < step) {
					//     valInput = step;
					//   }
					//
					//   if (valInput >= width) {
					//     valInput = width - step * 3;
					//   }
					//
					//   var _w = parseInt($(this).closest('.part-raspil').find('input[data-id="0"]').val()),
					//       _w2 = parseInt($(this).closest('.part-raspil').find('input[data-id="1"]').val()),
					//       _w3 = parseInt($(this).closest('.part-raspil').find('input[data-id="2"]').val()),
					//       w4 = parseInt($(this).closest('.part-raspil').find('input[data-id="3"]').val());
					//
					//   if ($(this).data('id') == '0') {
					//     var _sum3 = width - (_w3 + w4);
					//
					//     if (valInput < _sum3) {
					//       var _r12 = _sum3 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r12);
					//     } else if (valInput > _sum3) {
					//       var _r13 = (width - (valInput + step)) / 2;
					//
					//       var _r14 = (width - (valInput + step)) / 2;
					//
					//       if (Number.isInteger(_r13 / 10) == false) {
					//         _r13 = myRound10(_r13, 10);
					//         _r14 = width - (valInput + step) - _r13;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(step);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r13);
					//       $(this).closest('.part-raspil').find('input[data-id="3"]').val(_r14);
					//     }
					//   }
					//
					//   if ($(this).data('id') == '1') {
					//     var _sum4 = width - (_w3 + w4);
					//
					//     if (valInput < _sum4) {
					//       var _r15 = _sum4 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(_r15);
					//     } else if (valInput > _sum4) {
					//       var _r16 = (width - (valInput + step)) / 2;
					//
					//       var _r17 = (width - (valInput + step)) / 2;
					//
					//       if (Number.isInteger(_r16 / 10) == false) {
					//         _r16 = myRound10(_r16, 10);
					//         _r17 = width - (valInput + step) - _r16;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(step);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r16);
					//       $(this).closest('.part-raspil').find('input[data-id="3"]').val(_r17);
					//     }
					//   }
					//
					//   if ($(this).data('id') == '2') {
					//     var _sum5 = width - (_w + _w2);
					//
					//     if (valInput < _sum5) {
					//       var _r18 = _sum5 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="3"]').val(_r18);
					//     } else if (valInput > _sum5) {
					//       var _r19 = (width - (valInput + step)) / 2;
					//
					//       var _r20 = (width - (valInput + step)) / 2;
					//
					//       if (Number.isInteger(_r19 / 10) == false) {
					//         _r19 = myRound10(_r19, 10);
					//         _r20 = width - (valInput + step) - _r19;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(step);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r19);
					//       $(this).closest('.part-raspil').find('input[data-id="3"]').val(_r20);
					//     }
					//   }
					//
					//   if ($(this).data('id') == '3') {
					//     var _sum6 = width - (_w + _w2);
					//
					//     if (valInput < _sum6) {
					//       var _r21 = _sum6 - valInput;
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r21);
					//     } else if (valInput > _sum6) {
					//       var _r22 = (width - (valInput + step)) / 2;
					//
					//       var _r23 = (width - (valInput + step)) / 2;
					//
					//       if (Number.isInteger(_r22 / 10) == false) {
					//         _r22 = myRound10(_r22, 10);
					//         _r23 = width - (valInput + step) - _r22;
					//       }
					//
					//       $(this).val(valInput);
					//       $(this).closest('.part-raspil').find('input[data-id="0"]').val(step);
					//       $(this).closest('.part-raspil').find('input[data-id="1"]').val(_r22);
					//       $(this).closest('.part-raspil').find('input[data-id="2"]').val(_r23);
					//     }
					//   }
					// }

				}

				var sum = 0,
					arrSumWidth = [],
					arrLength = quantity - 1,
					propil = $('#slider').data('propil') ? $('#slider').data('propil') : 0;

				$('.part-raspil input').each(function (n) {
					const lastPropil = arrLength === n ? propil : 0;
					sum += parseInt($(this).val()) - lastPropil;
					arrSumWidth[$(this).data('id')] = sum;
				});

				$slider.find('.ui-slider-handle').each(function () {
					$slider.slider2('values', $(this).data('id'), arrSumWidth[$(this).data('id')]);
				});

				createObj();
				setMainInput();
				self.doChangeProps($('.prop-uslugi input'));
				separateTable();
			});
		}
	};

	this.catalogInitElementProps = function (parent, ElementGetPriceFunc) {
		self.catalogInitResize(parent, ElementGetPriceFunc);
		self.catalogInitRaspil();
		self.catalogElementFacade(parent);
		//self.controlSizeFasade(true);
		self.catalogInitImage();
		self.catalogInitSelect();
	}

	this.catalogInitSelect = function () {
		$('.selectpicker').selectpicker();
	}

	this.catalogInitImage = function () {
		var img = $('.preview');
		var targetProps = img.data('target-prop');
		if (targetProps) {
			var src = $('.prop-colors .selected input').data('image');
			var srcbig = $('.prop-colors .selected input').data('imagebig');

			$('.product__form .preview img').prop('src', src);
			$('.product__form .preview .image').prop('href', srcbig);
		}
	}

	this.catalogElementFacade = function (parent) {
		var elem = $(parent).find(".prop-facades input:checked");
		self.doChangeProps(elem);

		var elem = $(parent).find(".prop-colors input:checked");
		self.doChangeProps(elem);
	}

	this.catalogBasketOptionsChange = function (option_value, checked) {
		$(".basket-wrap .props-option").each(function () {
			var elem = $("input[value='" + option_value + "']", this);
			if (elem.length) {
				var group = elem.attr("_groups").split(",");
				var props = $(this);

				if (checked) {
					$(elem).prop("checked", true);
					$(elem).parent().removeClass("hidden").addClass("active");
					if (group.length == 2) {
						$(props).find("input").each(function () {
							if ($(this).is(":checked")) {
								if ($(this).val() != $(elem).val()) {
									var this_group = $(this).attr("_groups").split(",");
									if (this_group.length == 1) {
										for (var i in group) {
											if (group[i] == this_group[0]) {
												$(this).prop("checked", false);
												$(this).parent().removeClass("active").addClass("hidden");
												break;
											}
										}
									}
								}
							}
							else {
								if ($(this).attr("_groups").split(",").length == 2 && $(this).attr("_groups").split(",")[0] == group[0]) {
									if ($(this).attr("_default") == "Y") {
										$(this).prop("checked", true);
										$(this).parent().removeClass("hidden").addClass("active");
									}
									else {
										$(this).prop("checked", false);
										$(this).parent().removeClass("active").addClass("hidden");
									}
								}
							}

						});
					}
					else {
						$(props).find("input:checked").each(function () {
							if ($(this).val() != $(elem).val()) {
								var this_group = $(this).attr("_groups").split(",");
								for (var i in this_group) {
									if (this_group[i] == group[0]) {
										$(this).prop("checked", false);
										$(this).parent().removeClass("active").addClass("hidden");
										break;
									}
								}
							}
						});
					}
				}
				else {
					$(props).find("input").each(function () {
						if (group.length == 2) {
							var _group = group[1];
							var _group_parent = group[0];

							var _count = 0;	//количество отмеченных опций из группы "parent"

							$(".basket-wrap .options input").each(function () {
								var _name = $(this).attr("_groups").split(",");

								if (_name.length == 2 && _name[0] == _group_parent) {
									_count++;
									if (!$(this).prop("checked")) _count--;
								}
							});

							if (_count == 0) {
								//отмеченных опций не осталось - восстанавливаем default по группе "parent"

								$(props).find("input").each(function () {
									if ($(this).attr("_groups").split(",")[0] == _group_parent || $(this).attr("_groups").split(",")[1] == _group_parent) {
										if ($(this).attr("_default") == "Y") {
											$(this).prop("checked", true);
											$(this).parent().removeClass("hidden").addClass("active");
										}
										else {
											$(this).prop("checked", false);
											$(this).parent().removeClass("active").addClass("hidden");
										}
									}
								});
							}
							else if ($(this).attr("_groups").split(",")[1] == _group) {
								if ($(this).attr("_default") == "Y") {
									$(this).prop("checked", true);
									$(this).parent().removeClass("hidden").addClass("active");
								}
								else {
									$(this).prop("checked", false);
									$(this).parent().removeClass("active").addClass("hidden");
								}
							}
						}
						else if ($(this).attr("_groups").split(",")[0] == group[0]) {
							if ($(this).attr("_default") == "Y") {
								$(this).prop("checked", true);
								$(this).parent().removeClass("hidden").addClass("active");
							}
							else {
								$(this).prop("checked", false);
								$(this).parent().removeClass("active").addClass("hidden");
							}
						}
					});
				}
			}
		});
		self.catalogBasketUpdateAfterOptionsChange();
	}

	this.catalogBasketUpdateAfterOptionsChange = function () {
		$.ajax({
			type: "POST",
			async: true,
			url: apiPath + "/API/basket.option.update.php",
			data: $(".basket-form").serialize()
		}).done(function (info) {
			var data = $.parseJSON(info);
			for (var i in data) {
				$("." + i).html(data[i]);
			}
			self.catalogBasketUpdate(false);
		});
	}

	this.catalogChangeCatalogView = function () {
		self = this;

		$.ajax({
			type: "POST",
			async: true,
			url: apiPath + "/API/catalog.element.changeviewtype.php",
			data: $(this).data()
		}).done(function () {
			$('.catalog-grid-type a').removeClass('active');
			$(self).addClass('active');
			$('.catalog-section').removeClass('list table table_list');
			$('.catalog-section').addClass($(self).data('type'));
		});

		return false;
	}

	this.catalogprintBasket = function () {
		w = window.open('/personal/basket/print.php', '', 'width=' + 700 + ',height=' + 700 + ',left=' + ((window.innerWidth - 700) / 2) + ',top=' + ((window.innerHeight - 700) / 2));
		w.print();
		return false;
	}

	this.catalogcloseBasketMin = function () {
		clearTimeout(self.minBasketTimer);
		var el = $('.basket-min');
		el.html('');
		el.removeClass('showed');
		return false;
	}

	this.catalogremoveBasketMinItem = function (e) {
		var id = $(e.target).data('id');
		var el = $('.basket-min');
		$.ajax({
			type: "GET",
			async: true,
			url: apiPath + "/API/basket.basket.min.get.php?" + jQuery.param({ 'action': "delete", "id": id })
		}).done(function (msg) {
			self.catalogBasketUpdate(true);
			el.html(msg);
			el.addClass('showed');
			var pane = $(".basket-min .basket-wrap-min .basket");
			pane.jScrollPane();
			var api = pane.data('jsp');
			return api ? api.scrollToBottom(0) : false;
		});

		return false;
	}

	this.catalogBasketItemQuantityUpdate = function (id, quantity) {
		$.ajax({
			type: "POST",
			async: true,
			url: apiPath + "/API/basket.item.quantity.update.php",
			data: { ID: id, QUANTITY: quantity }
		}).done(function (msg) {
			$(".basket-wrap .basket .total_price").html(msg);

			if ($('input[name="NOT_DISCOUNT"]').val() !== undefined) {
				var notDiscount = parseFloat($('input[name="NOT_DISCOUNT"]').val());
				var percent = 2 - notDiscount;
				var oldP = (msg.replace(' руб', '').replace(' ', '') / percent).toFixed();
				var newP = parseInt(msg.replace(' руб', '').replace(' ', ''));
				var diff = oldP - newP;

				$(".total_price_nodiscount").html(Number(oldP).toLocaleString('ru-RU') + ' руб');
				$(".total_price_nodiscount_sum").html(Number(diff).toLocaleString('ru-RU') + ' руб');
			}

			self.catalogBasketUpdate(false);
		});
	}

	this.catalogBasketUpdate = function (refresh) {
		$.ajax({ type: "GET", async: true, url: apiPath + "/API/basket.update.php" }).done(function (msg) {
			if ($(".basket-wrap .basket, #orderWrap .orderContent, #orderattach .orderattachContent").length && refresh) document.location = document.location;
			else {
				$("#header .basket, .header-cart").replaceWith(msg);
				if (!$(".basket-wrap .basket").length) self.catalogShowBasketMin();
			}
		});
	}

	this.Confirm = function (text, ok, no) {
		var ok = ok || new Function;
		var no = no || new Function;

		var html = $("<div>", { "html": text });

		var dialog = $(html).dialog({
			autoOpen: true,
			modal: true,
			buttons: {
				"Ok": function () {
					ok();
					dialog.dialog("close");
				},
				"Отмена": function () {
					no();
					dialog.dialog("close");
				}
			}
		});
	}

	this.initCallBackForm = function () {
		$(document).on('click', '.call-back-form', function () {
			$('#phoneform').modal();
			return false;
		}).on('mouseenter', '.cbh-phone', function () {

			self.hoverCallBackForm(this, 'show');
			$('.cbh-phone').addClass('cbh-active');

		}).on('mouseleave', '.cbh-phone', function () {

			self.hoverCallBackForm(this, 'hide');
			$('.cbh-phone').removeClass('cbh-active');
		}).on('submit', 'form.form-ajax', function (e) {
			self.formInit(e);
			return false;
		})

		$(".slider-range").each(function (i, e) {
			var element = $(e);
			min = element.data('min'),
				max = element.data('max'),
				target = element.data('target');

			element.slider({
				range: true,
				min: min,
				max: max,
				values: [min, max],
				slide: function (event, ui) {
					$(target).val("c " + ui.values[0] + ":00 по " + ui.values[1] + ":00");
				}
			});
		});

		self.initPhoneMask();
		setInterval(function () {
			self.hoverCallBackForm($('.cbh-phone'), 'toggle');
		}, 5000);
	}

	this.initPhoneMask = function () {
		//PHONE_MASK
		$.fn.setCursorPosition = function (pos) {
			if ($(this).get(0).setSelectionRange) {
				$(this).get(0).setSelectionRange(pos, pos);
			} else if ($(this).get(0).createTextRange) {
				var range = $(this).get(0).createTextRange();
				range.collapse(true);
				range.moveEnd('character', pos);
				range.moveStart('character', pos);
				range.select();
			}
		};

		//$.mask.definitions['h'] = "[7,8]";

		$('.phone-mask').each(function (e) {
			$(this).click(function () {
				$(this).setCursorPosition(3);
			}).mask(PHONE_MASK, {
				placeholder: PHONE_PLACEHOLDER
			}).prop({ 'autocomplete': 'off', "placeholder": PHONE_PLACEHOLDER });
		});
	}

	this.initSummMask = function () {
		$('.amount-mask').each(function (e) {
			$(this).mask(SUMM_MASK, { reverse: true });
			$(this).prop('placeholder', SUMM_PLACEHOLDER);
		});
	}

	this.hoverCallBackForm = function (element, type) {
		if (type == 'show' || $(element).is('.cbh-active') || (type == 'toggle' && !$(element).is('.cbh-hover'))) {
			$(element).addClass('cbh-hover');
			$(element).addClass('cbh-green');
			$(element).removeClass('cbh-static');
		} else {
			$(element).removeClass('cbh-hover');
			$(element).addClass('cbh-static');
			$(element).removeClass('cbh-green');
		}
	}

	this.toastmessage = function (text, type) {
		var type = type || 'info';
		toastr[type](text);
	}

	this.initOrderDatePicker = function (start, period) {
		var val = $('.shipping_date[type=text]').val(),
			min = start || $('.shipping_date[type=text]').data('start'),
			max = period || $('.shipping_date[type=text]').data('period');

		if (!min)
			min = 20;

		if (!max)
			max = 31;

		val = start || min;

		$('.shipping_date_pick').datepicker("destroy");

		$('.shipping_date_pick').datepicker({ altField: ".shipping_date", altFormat: "dd.mm.yy", "defaultDate": +min, "minDate": +min, "maxDate": +(min + max) });

		if (val)
			$('.shipping_date_pick').datepicker('setDate', val);
	}

	this.formInit = function (e) {
		var formData = new FormData(e.target);
		var action = $(this).prop('action') || '/includes/form/ajaxForm.php';
		var method = $(this).prop('method') || 'post';
		var url = window.location.href;

		var form = $(e.target);
		formData.append('form', form.prop('name'));
		formData.append('CSRF', BX.bitrix_sessid());
		formData.append('URL', url);

		if (form.data('yatarget') && typeof ym == 'function' && METRIKA) {
			ym(METRIKA, 'getClientID', function (id) {
				formData.append('ClientID', id);
			});
		}

		var res = $('.form-result', form);

		$.ajax({
			method: method,
			url: action,
			data: formData,
			contentType: false,
			processData: false,
			dataType: 'json',
			async: true,
			success: function (data) {
				if (data.type == 'success') {
					self.blockingForm(form);

					if (form.data('yatarget') && typeof ym == 'function' && METRIKA) {
						ym(METRIKA, 'reachGoal', form.data('yatarget'));
						gtag('event', 'send', {
							'event_category': 'Forms',
							'event_action': 'Send',
							'event_label': form.data('yatarget')
						});
					}
				}
				if (data.type == 'error') {
					self.unblockingForm(form);
				}

				$('.form-group', form).each(function (e) {
					$(this).removeClass('has-error');
				});

				if (Object.keys(data.massages).length) {
					if (res.length) {
						res.html('');
						res.show(300);
						$.each(data.massages, function (i, e) {
							$('input[name=' + i + ']', form).parents('.form-group').addClass('has-error');
							var type = Object.keys(e)[0];
							var text = e[type];
							var el = $('<div>', {
								'class': 'alert alert-' + type,
								'text': text
							});
							res.append(el);
						});
					} else {
						toastr.clear();
						$.each(data.massages, function (i, e) {
							$('input[name=' + i + ']', form).parents('.form-group').addClass('has-error');
							var type = Object.keys(e)[0];
							var text = e[type];
							if (type == 'danger')
								type = 'error';

							toastr[type](text);
						});
					}
				}
			}
		});
		$('[type=submit]', form).prop('disabled', true);

		return false;
	}

	this.blockingForm = function (form) {
		var time = 10;
		$('[type=submit]', form).prop('disabled', true);
		$('.timer_wrap', form).show();
		$('.timer', form).text(time);
		var myTimer = setInterval(function () {
			time--;
			$('.timer', form).text(time);
		}, 1000);

		setTimeout(function () {
			$('.timer_wrap', form).hide();
			self.unblockingForm(form);
			form[0].reset();
			clearInterval(myTimer);
		}, time * 1000)

		if ($('.success-wrap', form).length) {
			$('.success-wrap', form).show();
			$('.field-wrap', form).hide();
		} else {
			$('.form-field-wrap', form).hide();
		}
	}

	this.unblockingForm = function (form) {
		$('[type=submit]', form).prop('disabled', false);
		self.resetForm(form)
	}

	this.resetForm = function (form) {
		$('input', form).parent('div.form-group').removeClass(['has-error']);
		if ($('.success-wrap', form).length) {
			$('.success-wrap', form).hide();
			$('.field-wrap', form).show();
		} else {
			$('.form-field-wrap', form).show();
		}
		$('.form-result', form).hide().html('');
	}

	this.InitMap = function () {
		if ($('#map').length && typeof mapConfig != undefined) {
			ymaps.ready(function () {
				var map = new ymaps.Map("map", {
					center: mapConfig.center,
					zoom: mapConfig.zoom
				});
				var objectManager = new ymaps.ObjectManager();
				objectManager.add(mapConfig.items);
				map.geoObjects.add(objectManager);
			});
		}
	}
}

export default CatalogApp;