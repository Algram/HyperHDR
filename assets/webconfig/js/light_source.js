var ledsCustomCfgInitialized = false;
var finalLedArray = [];
var conf_editor = null;
var aceEdt = null;
var ledStarter = false;

function round(number)
{
	var factor = Math.pow(10, 4);
	var tempNumber = number * factor;
	var roundedTempNumber = Math.round(tempNumber);
	return roundedTempNumber / factor;
};

var _lastLeds = [];
var _lastOrigin = "";
var _resizeObserver = null;

if (typeof ResizeObserver === "function" && _resizeObserver === null)
{
	_resizeObserver = new ResizeObserver(entries => {		
		if ( _lastOrigin != "" && _lastLeds.length > 0 )
		{
			createLedPreview(_lastLeds, _lastOrigin);			
		}
	});	
}

function createLedPreview(leds, origin)
{	
	_lastLeds = leds;
	_lastOrigin = origin;
	
	if (!ledStarter)
		$('#collapse1').collapse('toggle');
	
	if (origin == "classic")
	{		
		$('#previewcreator').html($.i18n('conf_leds_layout_preview_originCL'));
		$('#leds_preview').css("padding-top", "56.25%").css("position","relative");
	}
	else if (origin == "text")
	{				
		$('#previewcreator').html($.i18n('conf_leds_layout_preview_originTEXT'));
		$('#leds_preview').css("padding-top", "56.25%").css("position","relative");
	}
	else if (origin == "matrix")
	{		
		$('#previewcreator').html($.i18n('conf_leds_layout_preview_originMA'));
		$('#leds_preview').css("padding-top", "100%").css("position","relative");
	}
	
	ledStarter = true;

	$('#previewledcount').html($.i18n('conf_leds_layout_preview_totalleds', leds.length));
	$('#previewledpower').html($.i18n('conf_leds_layout_preview_ledpower', ((leds.length * 0.06) * 1.1).toFixed(1)));

	$('.st_helper').css("border", "8px solid grey");

	var canvas_height = $('#leds_preview').innerHeight();
	var canvas_width = $('#leds_preview').innerWidth();

	var leds_html = "";
	var hashTable = {};
	var groups = false;
	
	for (var idx = 0; idx < leds.length; idx++)
	{		
		var led = leds[idx];
		var led_id = 'ledc_' + [idx];
		var bgcolor = "hsla(" + (idx * 360 / leds.length) + ",100%,50%,0.75)";
		var optGroup = "";
		
		if (led.group !== undefined && led.group != 0)
		{
			if (led.group in hashTable)
			{
				bgcolor = hashTable[led.group];
			}
			
			optGroup = ", group: " + led.group;
			
			groups = true;
		}
		
		var pos = "left:" + (led.hmin * canvas_width) + "px;" +
			"top:" + (led.vmin * canvas_height) + "px;" +
			"width:" + ((led.hmax - led.hmin) * (canvas_width - 1)) + "px;" +
			"height:" + ((led.vmax - led.vmin) * (canvas_height - 1)) + "px;";
		leds_html += '<div id="' + led_id + '" group="'+led.group+'" class="led" style="background-color: ' + bgcolor + ';' + pos + '" title="' + idx + optGroup + '"><span id="' + led_id + '_num" class="led_prev_num">' + ((led.name) ? led.name : idx) + '</span></div>';
		
		hashTable[led.group] = bgcolor;
	}
	
	if (groups)
		leds_html += '<div data-i18n="conf_leds_layout_frame" style="position: absolute; text-align: center; left: ' + (0.3 * canvas_width) + 'px; top: ' + (0.45 * canvas_height) + 'px; width: ' + (0.4 * canvas_width) + 'px;">'+$.i18n('conf_leds_grouping_notification')+'</div>';
	
	$('#leds_preview').html(leds_html);
	
	var colors = ["black", "grey", "#A9A9A9"];

	for (var i = 0; i < 3 && i < leds.length; i++)
	{		
		var led = leds[i];
		var hColor = "-webkit-linear-gradient(30deg, rgba(255,255,255,0.0) 50%, "+colors[i]+" 50%)";
		var zIndex = 12-i;
		
		if (led.group != 0)
			$('#ledc_'+i).css({ "background-image": hColor, "z-index": zIndex });
		else
			$('#ledc_'+i).css({ "background-color": colors[i], "z-index": zIndex });
	}

	if ($('#leds_prev_toggle_num').hasClass('btn-success'))
		$('.led_prev_num').css("display", "inline");

	// update ace Editor content
	aceEdt.set(finalLedArray);
}

function createClassicLedLayoutSimple(ledstop, ledsleft, ledsright, ledsbottom, position, groupX, groupY, reverse)
{

	let params = {
		ledstop: 0,
		ledsleft: 0,
		ledsright: 0,
		ledsbottom: 0,
		ledsglength: 0,
		ledsgpos: 0,
		position: 0,
		groupX: 0,
		groupY: 0,
		reverse: false,
		ledsHDepth: 0.08,
		ledsVDepth: 0.05,
		overlap: 0,
		edgeVGap: 0,
		ptblh: 0,
		ptblv: 1,
		ptbrh: 1,
		ptbrv: 1,
		pttlh: 0,
		pttlv: 0,
		pttrh: 1,
		pttrv: 0		
	};

	params.ledstop = ledstop;
	params.ledsleft = ledsleft;
	params.ledsright = ledsright;
	params.ledsbottom = ledsbottom;
	params.position = position;
	params.groupX = groupX;
	params.groupY = groupY;
	params.reverse = reverse;

	return createClassicLedLayout(params);
}

function createClassicLedLayout(params)
{
	//helper
	var edgeHGap = params.edgeVGap / (16 / 9);
	var ledArray = [];

	function createFinalArray(array)
	{
		var finalLedArray = [];
		for (var i = 0; i < array.length; i++)
		{
			var hmin = array[i].hmin;
			var hmax = array[i].hmax;
			var vmin = array[i].vmin;
			var vmax = array[i].vmax;
			var group = array[i].group;
			finalLedArray[i] = {
				"hmax": hmax,
				"hmin": hmin,
				"vmax": vmax,
				"vmin": vmin,
				"group": group
			}
		}
		return finalLedArray;
	}

	function rotateArray(array, times)
	{
		if (times > 0)
		{
			while (times--)
			{
				array.push(array.shift())
			}
			return array;
		}
		else
		{
			while (times++)
			{
				array.unshift(array.pop())
			}
			return array;
		}
	}

	function valScan(val)
	{
		if (val > 1)
			return 1;
		if (val < 0)
			return 0;
		return val;
	}

	function ovl(scan, val)
	{
		if (scan == "+")
			return valScan(val += params.overlap);
		else
			return valScan(val -= params.overlap);
	}

	function createLedArray(hmin, hmax, vmin, vmax, group)
	{
		hmin = round(hmin);
		hmax = round(hmax);
		vmin = round(vmin);
		vmax = round(vmax);
		ledArray.push(
		{
			"hmin": hmin,
			"hmax": hmax,
			"vmin": vmin,
			"vmax": vmax,
			"group": group
		});
	}

	function createTopLeds(groupStart)
	{
		var steph = (params.pttrh - params.pttlh - (2 * edgeHGap)) / params.ledstop;
		var stepv = (params.pttrv - params.pttlv) / params.ledstop;
		var maxGroup = 0;
		
		for (var i = 0; i < params.ledstop; i++)
		{
			var hmin = ovl("-", params.pttlh + (steph * Number([i])) + edgeHGap);
			var hmax = ovl("+", params.pttlh + (steph * Number([i + 1])) + edgeHGap);
			var vmin = params.pttlv + (stepv * Number([i]));
			var vmax = vmin + params.ledsHDepth;
						
			if (params.groupX > 0 && (params.groupX * 2 <= params.ledstop))
			{
				var group = Math.floor(((i * params.groupX) / params.ledstop))+1;
				maxGroup = Math.max(maxGroup, group);
				createLedArray(hmin, hmax, vmin, vmax, group + groupStart);
			}
			else
				createLedArray(hmin, hmax, vmin, vmax, 0);
		}
		
		return maxGroup + groupStart;
	}

	function createRightLeds(groupStart)
	{
		var steph = (params.ptbrh - params.pttrh) / params.ledsright;
		var stepv = (params.ptbrv - params.pttrv - (2 * params.edgeVGap)) / params.ledsright;
		var maxGroup = 0;
		
		for (var i = 0; i < params.ledsright; i++)
		{
			var hmax = params.pttrh + (steph * Number([i + 1]));
			var hmin = hmax - params.ledsVDepth;
			var vmin = ovl("-", params.pttrv + (stepv * Number([i])) + params.edgeVGap);
			var vmax = ovl("+", params.pttrv + (stepv * Number([i + 1])) + params.edgeVGap);

			if (params.groupY > 0 && (params.groupY * 2 <= params.ledsright))
			{
				var group = Math.floor(((i * params.groupY) / params.ledsright))+1;
				maxGroup = Math.max(maxGroup, group);
				createLedArray(hmin, hmax, vmin, vmax, group + groupStart);
			}			
			else
				createLedArray(hmin, hmax, vmin, vmax, 0);
		}
		
		return maxGroup + groupStart;
	}

	function createBottomLeds(groupStart)
	{
		var steph = (params.ptbrh - params.ptblh - (2 * edgeHGap)) / params.ledsbottom;
		var stepv = (params.ptbrv - params.ptblv) / params.ledsbottom;
		var maxGroup = 0;
		
		for (var i = params.ledsbottom - 1; i > -1; i--)
		{
			var hmin = ovl("-", params.ptblh + (steph * Number([i])) + edgeHGap);
			var hmax = ovl("+", params.ptblh + (steph * Number([i + 1])) + edgeHGap);
			var vmax = params.ptblv + (stepv * Number([i]));
			var vmin = vmax - params.ledsHDepth;
			
			if (params.groupX > 0 && (params.groupX * 2 <= params.ledsbottom))
			{
				var group = Math.floor(((i * params.groupX) / params.ledsbottom))+1;
				maxGroup = Math.max(maxGroup, group);
				createLedArray(hmin, hmax, vmin, vmax, group + groupStart);
			}
			else
				createLedArray(hmin, hmax, vmin, vmax, 0);
		}
		
		return maxGroup + groupStart;
	}

	function createLeftLeds(groupStart)
	{
		var steph = (params.ptblh - params.pttlh) / params.ledsleft;
		var stepv = (params.ptblv - params.pttlv - (2 * params.edgeVGap)) / params.ledsleft;
		var maxGroup = 0;

		for (var i = params.ledsleft - 1; i > -1; i--)
		{
			var hmin = params.pttlh + (steph * Number([i]));
			var hmax = hmin + params.ledsVDepth;
			var vmin = ovl("-", params.pttlv + (stepv * Number([i])) + params.edgeVGap);
			var vmax = ovl("+", params.pttlv + (stepv * Number([i + 1])) + params.edgeVGap);

			if (params.groupY > 0 && (params.groupY * 2 <= params.ledsleft))
			{
				var group = Math.floor(((i * params.groupY) / params.ledsleft))+1;
				maxGroup = Math.max(maxGroup, group);
				createLedArray(hmin, hmax, vmin, vmax, group + groupStart);
			}
			else
				createLedArray(hmin, hmax, vmin, vmax, 0);
		}
		
		return maxGroup + groupStart;
	}

	//rectangle
	var groupIndex = 0;
	groupIndex = createTopLeds(groupIndex);
	groupIndex = createRightLeds(groupIndex);
	groupIndex = createBottomLeds(groupIndex);
	groupIndex = createLeftLeds(groupIndex);

	//check led gap pos
	if (params.ledsgpos + params.ledsglength > ledArray.length)
	{
		var mpos = Math.max(0, ledArray.length - params.ledsglength);
		//$('#ip_cl_ledsgpos').val(mpos);
		ledsgpos = mpos;
	}

	//check led gap length
	if (params.ledsglength >= ledArray.length)
	{
		//$('#ip_cl_ledsglength').val(ledArray.length-1);
		params.ledsglength = ledArray.length - params.ledsglength - 1;
	}

	if (params.ledsglength != 0)
	{
		ledArray.splice(params.ledsgpos, params.ledsglength);
	}

	if (params.position != 0)
	{
		rotateArray(ledArray, params.position);
	}

	if (params.reverse)
		ledArray.reverse();

	return createFinalArray(ledArray);
}

function createClassicLeds()
{	
	//get values
	let params = {
		ledstop: parseInt($("#ip_cl_top").val()),
		ledsbottom: parseInt($("#ip_cl_bottom").val()),
		ledsleft: parseInt($("#ip_cl_left").val()),
		ledsright: parseInt($("#ip_cl_right").val()),
		ledsglength: parseInt($("#ip_cl_glength").val()),
		ledsgpos: parseInt($("#ip_cl_gpos").val()),
		position: parseInt($("#ip_cl_position").val()),
		groupX: parseInt($("#ip_cl_groupX").val()),
		groupY: parseInt($("#ip_cl_groupY").val()),
		reverse: $("#ip_cl_reverse").is(":checked"),

		//advanced values
		ledsVDepth: parseInt($("#ip_cl_vdepth").val()) / 100,
		ledsHDepth: parseInt($("#ip_cl_hdepth").val()) / 100,
		edgeVGap: parseInt($("#ip_cl_edgegap").val()) / 100 / 2,
		//cornerVGap : parseInt($("#ip_cl_cornergap").val())/100/2,
		overlap: $("#ip_cl_overlap").val() / 100,

		//trapezoid values % -> float
		ptblh: parseInt($("#ip_cl_pblh").val()) / 100,
		ptblv: parseInt($("#ip_cl_pblv").val()) / 100,
		ptbrh: parseInt($("#ip_cl_pbrh").val()) / 100,
		ptbrv: parseInt($("#ip_cl_pbrv").val()) / 100,
		pttlh: parseInt($("#ip_cl_ptlh").val()) / 100,
		pttlv: parseInt($("#ip_cl_ptlv").val()) / 100,
		pttrh: parseInt($("#ip_cl_ptrh").val()) / 100,
		pttrv: parseInt($("#ip_cl_ptrv").val()) / 100,
	}

	finalLedArray = createClassicLedLayout(params);

	//check led gap pos
	if (params.ledsgpos + params.ledsglength > finalLedArray.length)
	{
		var mpos = Math.max(0, finalLedArray.length - params.ledsglength);
		$('#ip_cl_ledsgpos').val(mpos);
	}
	//check led gap length
	if (params.ledsglength >= finalLedArray.length)
	{
		$('#ip_cl_ledsglength').val(finalLedArray.length - 1);
	}

	createLedPreview(finalLedArray, 'classic');
}

function createMatrixLayout(ledshoriz, ledsvert, cabling, start)
{
	// Big thank you to RanzQ (Juha Rantanen) from Github for this script
	// https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

	var parallel = false
	var leds = []
	var hblock = 1.0 / ledshoriz
	var vblock = 1.0 / ledsvert

	if (cabling == "parallel")
	{
		parallel = true
	}

	/**
	 * Adds led to the hyperhdr config led array
	 * @param {Number} x     Horizontal position in matrix
	 * @param {Number} y     Vertical position in matrix
	 */
	function addLed(x, y)
	{
		var hscanMin = x * hblock
		var hscanMax = (x + 1) * hblock
		var vscanMin = y * vblock
		var vscanMax = (y + 1) * vblock

		hscanMin = round(hscanMin);
		hscanMax = round(hscanMax);
		vscanMin = round(vscanMin);
		vscanMax = round(vscanMax);

		leds.push(
		{
			hmin: hscanMin,
			hmax: hscanMax,
			vmin: vscanMin,
			vmax: vscanMax,
			group: 0
		})
	}

	var startYX = start.split('-')
	var startX = startYX[1] === 'right' ? ledshoriz - 1 : 0
	var startY = startYX[0] === 'bottom' ? ledsvert - 1 : 0
	var endX = startX === 0 ? ledshoriz - 1 : 0
	var endY = startY === 0 ? ledsvert - 1 : 0
	var forward = startX < endX

	var downward = startY < endY

	var x, y

	for (y = startY; downward && y <= endY || !downward && y >= endY; y += downward ? 1 : -1)
	{
		for (x = startX; forward && x <= endX || !forward && x >= endX; x += forward ? 1 : -1)
		{
			addLed(x, y)
		}
		if (!parallel)
		{
			forward = !forward
			var tmp = startX
			startX = endX
			endX = tmp
		}
	}

	return leds;
}

function createMatrixLeds()
{
	// Big thank you to RanzQ (Juha Rantanen) from Github for this script
	// https://raw.githubusercontent.com/RanzQ/hyperion-audio-effects/master/matrix-config.js

	//get values
	var ledshoriz = parseInt($("#ip_ma_ledshoriz").val());
	var ledsvert = parseInt($("#ip_ma_ledsvert").val());
	var cabling = $("#ip_ma_cabling").val();
	var start = $("#ip_ma_start").val();

	finalLedArray = createMatrixLayout(ledshoriz, ledsvert, cabling, start);
	createLedPreview(finalLedArray, 'matrix');
}

function isEmpty(obj)
{
	for (var key in obj)
	{
		if (obj.hasOwnProperty(key))
			return false;
	}
	return true;
}

$(document).ready(function()
{
	// translate
	performTranslation();

	//add intros
	if (window.showOptHelp)
	{
		createHintH("callout-info", $.i18n('conf_leds_device_intro'), "leddevice_intro");
		createHintH("callout-info", $.i18n('conf_leds_layout_intro'), "layout_intro");
		$('#led_vis_help').html('<div><div class="led_ex" style="background-color:black;margin-right:5px;margin-top:3px"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l1') + '</div></div><div class="led_ex" style="background-color:grey;margin-top:3px;margin-right:2px"></div><div class="led_ex" style="background-color: rgb(169, 169, 169);margin-right:5px;margin-top:3px;"></div><div style="display:inline-block;vertical-align:top">' + $.i18n('conf_leds_layout_preview_l2') + '</div>');
	}

	var slConfig = window.serverConfig.ledConfig;	

	//restore ledConfig - Classic
	for (var key in slConfig.classic)
	{
		if (typeof(slConfig.classic[key]) === "boolean")
			$('#ip_cl_' + key).prop('checked', slConfig.classic[key]);
		else
			$('#ip_cl_' + key).val(slConfig.classic[key]);
	}

	//restore ledConfig - Matrix
	for (var key in slConfig.matrix)
	{
		if (typeof(slConfig.matrix[key]) === "boolean")
			$('#ip_ma_' + key).prop('checked', slConfig.matrix[key]);
		else
			$('#ip_ma_' + key).val(slConfig.matrix[key]);
	}

	function saveValues()
	{
		var ledConfig = {
			classic:
			{},
			matrix:
			{}
		};

		for (var key in slConfig.classic)
		{
			if (typeof(slConfig.classic[key]) === "boolean")
				ledConfig.classic[key] = $('#ip_cl_' + key).is(':checked');
			else if (Number.isInteger(slConfig.classic[key]))
				ledConfig.classic[key] = parseInt($('#ip_cl_' + key).val());
			else
				ledConfig.classic[key] = $('#ip_cl_' + key).val();
		}

		for (var key in slConfig.matrix)
		{
			if (typeof(slConfig.matrix[key]) === "boolean")
				ledConfig.matrix[key] = $('#ip_ma_' + key).is(':checked');
			else if (Number.isInteger(slConfig.matrix[key]))
				ledConfig.matrix[key] = parseInt($('#ip_ma_' + key).val());
			else
				ledConfig.matrix[key] = $('#ip_ma_' + key).val();
		}
		requestWriteConfig(
		{
			ledConfig
		});
	}

	// check access level and adjust ui
	if (storedAccess == "default")
	{
		$('#texfield_panel').toggle(false);
		$('#previewcreator').toggle(false);
	}
	
	// bind change event to all inputs
	$('.ledCLconstr').bind("change", function()
	{
		valValue(this.id, this.value, this.min, this.max);
		createClassicLeds();
	});

	$('.ledMAconstr').bind("change", function()
	{
		valValue(this.id, this.value, this.min, this.max);
		createMatrixLeds();
	});

	// v4 of json schema with diff required assignment
	var ledschema = {
		"items":
		{
			"additionalProperties": false,
			"required": ["hmin", "hmax", "vmin", "vmax", "group"],
			"properties":
			{
				"name":
				{
					"type": "string"
				},
				"colorOrder":
				{
					"enum": ["rgb", "bgr", "rbg", "brg", "gbr", "grb"],
					"type": "string"
				},
				"hmin":
				{
					"maximum": 1,
					"minimum": 0,
					"type": "number"
				},
				"hmax":
				{
					"maximum": 1,
					"minimum": 0,
					"type": "number"
				},
				"vmin":
				{
					"maximum": 1,
					"minimum": 0,
					"type": "number"
				},
				"vmax":
				{
					"maximum": 1,
					"minimum": 0,
					"type": "number"
				},
				"group": {
					"type": "integer",
					"minimum": 0					
				}
			},
			"type": "object"
		},
		"type": "array"
	};
	//create jsonace editor
	aceEdt = new JSONACEEditor(document.getElementById("aceedit"),
	{
		mode: 'code',
		schema: ledschema,
		onChange: function()
		{
			var success = true;
			try
			{
				aceEdt.get();
			}
			catch (err)
			{
				success = false;
			}

			if (success)
			{
				$('#leds_custom_updsim').attr("disabled", false);
				$('#leds_custom_save').attr("disabled", false);
			}
			else
			{
				$('#leds_custom_updsim').attr("disabled", true);
				$('#leds_custom_save').attr("disabled", true);
			}

			if (window.readOnlyMode)
			{
				$('#leds_custom_save').attr('disabled', true);
			}
		}
	}, window.serverConfig.leds);

	//TODO: HACK! No callback for schema validation - Add it!
	setInterval(function()
	{
		if ($('#aceedit table').hasClass('jsoneditor-text-errors'))
		{
			$('#leds_custom_updsim').attr("disabled", true);
			$('#leds_custom_save').attr("disabled", true);
		}
	}, 1000);

	$('.jsoneditor-menu').toggle();

	// leds to finalLedArray
	finalLedArray = window.serverConfig.leds;

	// create and update editor
	$("#leddevices").off().on("change", function()
	{
		var generalOptions = window.serverSchema.properties.device;

		// Modified schema entry "hardwareLedCount" in generalOptions to minimum LedCount
		var ledType = $(this).val();

		//philipshueentertainment backward fix
		if (ledType == "philipshueentertainment") ledType = "philipshue";

		var specificOptions = window.serverSchema.properties.alldevices[ledType];
		
		$("#editor_container").empty();
		
		conf_editor = createJsonEditor('editor_container',
		{
			generalOptions: generalOptions,
			specificOptions: specificOptions,
		});

		var values_general = {};
		var values_specific = {};
		var isCurrentDevice = (window.serverConfig.device.type == ledType);

		for (var key in window.serverConfig.device)
		{
			if (key != "type" && key in generalOptions.properties) values_general[key] = window.serverConfig.device[key];
		};
		conf_editor.getEditor("root.generalOptions").setValue(values_general);

		if (isCurrentDevice)
		{
			var specificOptions_val = conf_editor.getEditor("root.specificOptions").getValue();
			for (var key in specificOptions_val)
			{
				values_specific[key] = (key in window.serverConfig.device) ? window.serverConfig.device[key] : specificOptions_val[key];
			};
			conf_editor.getEditor("root.specificOptions").setValue(values_specific);
		};

		// change save button state based on validation result
		var firstValid = conf_editor.validate();
		if ((firstValid.length > 1 || (firstValid.length == 1 && firstValid[0].path != "root.generalOptions.type")) || window.readOnlyMode)
		{
			$('#btn_submit_controller').attr('disabled', true);
		}
		else
		{
			$('#btn_submit_controller').attr('disabled', false);
		}

		conf_editor.on('change', function()
		{
			window.readOnlyMode ? $('#btn_cl_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
			window.readOnlyMode ? $('#btn_ma_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
			window.readOnlyMode ? $('#leds_custom_save').attr('disabled', true) : $('#btn_submit').attr('disabled', false);
		});

		// led controller sepecific wizards
		$('#btn_wiz_holder').html("");
		$('#btn_led_device_wiz').off();
		
		
		var whiteChannelList = $("div[data-schemapath='root.specificOptions.white_channel_limit']");
		if (whiteChannelList.length)
		{
			let infoRGBW = `<div class="ms-1 me-1 alert alert-yellow row" role="alert"><div class="col-12">${$.i18n('calibration_channel_info')}</div></div>`
			var insertCalInfo = whiteChannelList.first();
			
			insertCalInfo.prepend(infoRGBW);
		}
		
		if (ledType == "philipshue")
		{
			$("input[name='root[specificOptions][useEntertainmentAPI]']").bind("change", function()
			{
				var ledWizardType = (this.checked) ? "philipshueentertainment" : ledType;
				var data = {
					type: ledWizardType
				};
				var hue_title = (this.checked) ? 'wiz_hue_e_title' : 'wiz_hue_title';
				changeWizard(data, hue_title, startWizardPhilipsHue);
								
				createHintH('callout-warning', $.i18n('philips_option_changed_bri'), 'btn_wiz_holder');
				
			});
			$("input[name='root[specificOptions][useEntertainmentAPI]']").trigger("change");
		}
		/*
		    else if(ledType == "wled") {
		    	    var ledWizardType = (this.checked) ? "wled" : ledType;
		    	    var data = { type: ledWizardType };
		    	    var wled_title = 'wiz_wled_title';
		    	    changeWizard(data, wled_title, startWizardWLED);
			}
		*/
		else if (ledType == "atmoorb")
		{
			var ledWizardType = (this.checked) ? "atmoorb" : ledType;
			var data = {
				type: ledWizardType
			};
			var atmoorb_title = 'wiz_atmoorb_title';
			changeWizard(data, atmoorb_title, startWizardAtmoOrb);
		}
		else if (ledType == "cololight")
		{
			var ledWizardType = (this.checked) ? "cololight" : ledType;
			var data = {
				type: ledWizardType
			};
			var cololight_title = 'wiz_cololight_title';
			changeWizard(data, cololight_title, startWizardCololight);
		}
		else if (ledType == "yeelight")
		{
			var ledWizardType = (this.checked) ? "yeelight" : ledType;
			var data = {
				type: ledWizardType
			};
			var yeelight_title = 'wiz_yeelight_title';
			changeWizard(data, yeelight_title, startWizardYeelight);
		}
		else if (ledType == "adalight")
		{					
			if (!(window.serverInfo.serialPorts == null || window.serverInfo.serialPorts.length == 0 || $("#selectPortSerial").length > 0))
			{
				let sPort = $("<select id=\"selectPortSerial\" />");				
				sPort.addClass("form-select bg-warning").css('width', String(40)+'%');
				
				$("<option />", {value: "auto", text: $.i18n("edt_dev_spec_outputPath_title")}).appendTo(sPort);
				(window.serverInfo.serialPorts).forEach(function (val) {
					$("<option />", {value: val.port, text: val.desc}).appendTo(sPort);
				});
				
				$("input[name='root[specificOptions][output]']")[0].style.width = String(58) + "%";
				$("input[name='root[specificOptions][output]']")[0].parentElement.appendChild(sPort[0]);
				
				sPort.off().on('change', function () {
					conf_editor.getEditor('root.specificOptions.output').setValue(sPort.val());
				});				
			}
		}
		else if (ledType == "wled")
		{					
			async function wledRefresh(result)
			{
				let receiver = $("#selectWledInstances");
				receiver.off();
				receiver.empty();

				$("<option />", {value: "", text: $.i18n("select_wled_intro")}).appendTo(receiver);

				if (result.info != null && result.info.devices != null)
				{					
					(result.info.devices).forEach(function (val) {
						$("<option />", {value: val.value, text: val.name}).appendTo(receiver);
					});
				}

				$("<option />", {value: -1, text: $.i18n("select_wled_rescan")}).appendTo(receiver);

				receiver.on('change', function ()
				{
					let selVal = $("#selectWledInstances").val();
					if (selVal == -1)
						requestLedDeviceDiscovery('wled').then( (result) => wledRefresh(result));
					else if (selVal != "")
						conf_editor.getEditor('root.specificOptions.host').setValue(selVal);
				});			
			}

			let sPort = $("<select id=\"selectWledInstances\" />");				
			sPort.addClass("form-select bg-warning").css('width', String(40)+'%');

			requestLedDeviceDiscovery('wled').then( (result) => wledRefresh(result));
				
			$("input[name='root[specificOptions][host]']")[0].style.width = String(58) + "%";
			$("input[name='root[specificOptions][host]']")[0].parentElement.appendChild(sPort[0]);			
		}
		
		function changeWizard(data, hint, fn)
		{
			$('#btn_wiz_holder').html("")
			createHint("wizard", $.i18n(hint), "btn_wiz_holder", "btn_led_device_wiz");
			$('#btn_led_device_wiz').off().on('click', data, fn);
		}
	});

	//philipshueentertainment backward fix
	if (window.serverConfig.device.type == "philipshueentertainment") window.serverConfig.device.type = "philipshue";

	// create led device selection
	var ledDevices = window.serverInfo.ledDevices.available;
	var devRPiSPI = ['apa102', 'apa104', 'ws2801', 'lpd6803', 'lpd8806', 'p9813', 'sk6812spi', 'sk6822spi', 'sk9822', 'ws2812spi','awa_spi'];
	var devRPiPWM = ['ws281x'];
	var devRPiGPIO = ['piblaster'];

	var devNET = ['atmoorb', 'cololight', 'fadecandy', 'philipshue', 'nanoleaf', 'tinkerforge', 'tpm2net', 'udpe131', 'udpartnet', 'udph801', 'udpraw', 'wled', 'yeelight'];
	var devUSB = ['adalight', 'dmx', 'atmo', 'lightpack', 'paintpack', 'rawhid', 'sedu', 'tpm2', 'karate'];

	var optArr = [
		[]
	];
	optArr[1] = [];
	optArr[2] = [];
	optArr[3] = [];
	optArr[4] = [];
	optArr[5] = [];

	for (var idx = 0; idx < ledDevices.length; idx++)
	{
		if ($.inArray(ledDevices[idx], devRPiSPI) != -1)
			optArr[0].push(ledDevices[idx]);
		else if ($.inArray(ledDevices[idx], devRPiPWM) != -1)
			optArr[1].push(ledDevices[idx]);
		else if ($.inArray(ledDevices[idx], devRPiGPIO) != -1)
			optArr[2].push(ledDevices[idx]);
		else if ($.inArray(ledDevices[idx], devNET) != -1)
			optArr[3].push(ledDevices[idx]);
		else if ($.inArray(ledDevices[idx], devUSB) != -1)
			optArr[4].push(ledDevices[idx]);
		else
			optArr[5].push(ledDevices[idx]);
	}

	$("#leddevices").append(createSel(optArr[0], $.i18n('conf_leds_optgroup_RPiSPI')));
	$("#leddevices").append(createSel(optArr[1], $.i18n('conf_leds_optgroup_RPiPWM')));
	$("#leddevices").append(createSel(optArr[2], $.i18n('conf_leds_optgroup_RPiGPIO')));
	$("#leddevices").append(createSel(optArr[3], $.i18n('conf_leds_optgroup_network')));
	$("#leddevices").append(createSel(optArr[4], $.i18n('conf_leds_optgroup_usb')));
	$("#leddevices").append(createSel(optArr[5], $.i18n('conf_leds_optgroup_debug')));
	$("#leddevices").val(window.serverConfig.device.type);
	

	// validate textfield and update preview
	$("#leds_custom_updsim").off().on("click", function()
	{
		createLedPreview(aceEdt.get(), 'text');
	});

	// save led config and saveValues - passing textfield
	$("#btn_ma_save, #btn_cl_save").off().on("click", function()
	{
		requestWriteConfig(
		{
			"leds": finalLedArray
		});
		saveValues();
	});

	// save led config from textfield
	$("#leds_custom_save").off().on("click", function()
	{
		requestWriteConfig(JSON.parse('{"leds" :' + aceEdt.getText() + '}'));
		saveValues();
	});

	// toggle led numbers
	$('#leds_prev_toggle_num').off().on("click", function()
	{
		$('.led_prev_num').toggle();
		toggleClass('#leds_prev_toggle_num', "btn-danger", "btn-success");
	});

	// open checklist
	$('#leds_prev_checklist').off().on("click", function()
	{
		var liList = [$.i18n('conf_leds_layout_checkp1'), $.i18n('conf_leds_layout_checkp3'), $.i18n('conf_leds_layout_checkp2'), $.i18n('conf_leds_layout_checkp4')];
		var ul = document.createElement("ul");
		ul.className = "checklist"

		for (var i = 0; i < liList.length; i++)
		{
			var li = document.createElement("li");
			li.innerHTML = liList[i];
			ul.appendChild(li);
		}
		showInfoDialog('checklist', "", ul);
	});

	// nav
	$('#leds_cfg_nav').on('shown.bs.tab', function(e)
	{
		var target = $(e.target).attr("href") // activated tab
		if (target == "#menu_gencfg" && !ledsCustomCfgInitialized)
		{
			$('#leds_custom_updsim').trigger('click');
			ledsCustomCfgInitialized = true;
			
			if (typeof _resizeObserver === "object" && !(_resizeObserver === null))
			{
				_resizeObserver.unobserve(document.getElementById("leds_preview"));
				_resizeObserver.observe(document.getElementById("leds_preview"));
			}
		}
	});

	// save led device config
	$("#btn_submit_controller").off().on("click", function(event)
	{
		var ledDevice = $("#leddevices").val();
		var result = {
			device:
			{}
		};

		var general = conf_editor.getEditor("root.generalOptions").getValue();
		var specific = conf_editor.getEditor("root.specificOptions").getValue();
		for (var key in general)
		{
			result.device[key] = general[key];
		}

		for (var key in specific)
		{
			result.device[key] = specific[key];
		}
		result.device.type = ledDevice;
		requestWriteConfig(result)
	});
	
	$(".stepper-down").off().on("click", function(event)
	{	
		var target=this.parentElement.parentElement.firstElementChild;
		if (typeof target !== 'undefined' && target.type === "number")
		{
			target.stepDown();
			$(target).trigger('change');
		};
	});
	
	$(".stepper-up").off().on("click", function(event)
	{		
		var target=this.parentElement.parentElement.firstElementChild;
		if (typeof target !== 'undefined' && target.type === "number")
		{
			target.stepUp();
			$(target).trigger('change');
		};
	});
	
	removeOverlay();
	
	
	if (!isSmallScreen())
	{
		putInstanceName(document.getElementById('instTarget1'));
		document.getElementById('instTarget1').lastElementChild.style.marginLeft = "auto";
		document.getElementById('instTarget1').lastElementChild.classList.add("d-inline-flex", "align-items-center");
	}
	else
		putInstanceName(document.getElementById('instTarget3'));
	
	putInstanceName(document.getElementById('instTarget2'));

	$("#leddevices").trigger("change");
	
});
