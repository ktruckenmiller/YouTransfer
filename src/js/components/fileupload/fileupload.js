'use strict';

// ------------------------------------------------------------------------------------------ Component Dependencies
var _ = require('underscore');
var $ = require('jquery');
var uuid = require('uuid');
var Dropzone = require('dropzone');
Dropzone.autoDiscover = false;

// ------------------------------------------------------------------------------------------ Component Variables

var COMPONENT_ATTR = 'data-fileupload';
var COMPONENT_SELECTOR = '[' + COMPONENT_ATTR + ']';
var DROPZONE_CLASS = 'dropzone';
var DROPZONE_PARAMETER = 'dz-payload';

var DROPZONE_PREVIEW_TEMPLATE_SELECTOR = '.dz-preview-template';
var DROPZONE_PREVIEW_DESCRIPTION_SELECTOR = '.dz-preview-description';
var DROPZONE_PREVIEW_DATALINK_SELECTOR = '[data-dz-link]';
var DROPZONE_PREVIEW_ERROR_MESSAGE_SELECTOR = '[data-dz-errormessage]';
var DROPZONE_PREVIEW_PROGRESS_SELECTOR = '.dz-preview-progress';

var DROPZONE_UPLOAD_COMPLETE_CLASS = 'dz-upload-complete';
var DROPZONE_UPLOAD_COMPLETE_SELECTOR = '.' + DROPZONE_UPLOAD_COMPLETE_CLASS;
var DROPZONE_COMPLETED_CONTAINER_SELECTOR = '.dz-completed-container';

var DROPZONE_ACTIONS_ADD_SELECTOR = '.dz-action-add';

// ------------------------------------------------------------------------------------------ Component Definition

function Fileupload(element) {

	var component = this;
	component.$element = $(element);
	component.$element.addClass(DROPZONE_CLASS);

	component.bundle = {
		id: uuid.v4(),
		files: []
	};

	component.previewTemplate = component.$element.find(DROPZONE_PREVIEW_TEMPLATE_SELECTOR).html();
	component.$element.find(DROPZONE_PREVIEW_TEMPLATE_SELECTOR).empty();

	component.$previewContainer = component.$element.find(DROPZONE_PREVIEW_TEMPLATE_SELECTOR);
	component.$previewContainer.removeClass('hidden');
	component.previewContainer = component.$previewContainer.get(0);

	component.completeTemplate = component.$element.find(DROPZONE_UPLOAD_COMPLETE_SELECTOR);
	component.completeTemplate = component.completeTemplate.detach().html();
	component.$completedContainer = $(DROPZONE_COMPLETED_CONTAINER_SELECTOR);
	var displayEmailer = _.once(function() {
		component.$completedContainer.html(component.completeTemplate).addClass(DROPZONE_UPLOAD_COMPLETE_CLASS);

		component.$completedContainer.find('.btn.loading').attr('disabled', true);
	});
	$.getJSON('/settings/dropzone').done(function(settings) {

		var options = $.extend({
			url: '/upload',
			paramName: DROPZONE_PARAMETER,
			dictDefaultMessage: '<span class="glyphicon glyphicon-download-alt drop-icon" style="font-size: 3em;"></span><br /><br /> <span class="click-to-select">drop all files here or click to select</span>',
			dictFallbackMessage: '',

			previewTemplate: component.previewTemplate,
			previewsContainer: component.previewContainer,
			clickable: DROPZONE_ACTIONS_ADD_SELECTOR
		}, settings.dropzone);
		component.dropzone = new Dropzone(element, options);

		if(!settings.dropzone.forceFallback) {
			component.dropzone.on("addedfile", function(file, filename) {

				component.$element.addClass("dz-files-added");
				function truncateFilename (filename) {
					if(filename) {
						if(filename.length > 42) {
						  var ext = filename.slice(-4);
						  var name = filename.substring(0, filename.length - 4);
						  name = name.slice(0, 38);
							console.log(name+ ext);
						  return name + ext;
						}else {
							console.log(filename);
							return filename;
						}

					}
				}
				var filename = truncateFilename(file.name);
				component.$element.find('.dz-filename').html(filename);
			});

			component.dropzone.on("sending", function(file, xhr, formData) {
				//disable the send button

				formData.append("bundle", component.bundle.id);
				displayEmailer();
			});
			component.dropzone.on("uploadprogress", function(result, progress) {
				if(progress === 100) {
					setTimeout(function() {
						result.previewElement.classList.add("dz-filing");
					}, 500);
				}


			});
			component.dropzone.on("complete", function(result) {

				$(result.previewElement).find(DROPZONE_PREVIEW_DESCRIPTION_SELECTOR).removeClass('col-md-7');
				$(result.previewElement).find(DROPZONE_PREVIEW_PROGRESS_SELECTOR).hide();
				if(result.xhr) {
					var response = JSON.parse(result.xhr.response);

					if(response.errors.length > 0) {
						$.each(response.errors, function(i, error) {
							$(result.previewElement).find(DROPZONE_PREVIEW_ERROR_MESSAGE_SELECTOR)
													.html(error.message);
						});
					} else {
						var file = response.bundle.files[0];
						$(result.previewElement).find(DROPZONE_PREVIEW_DATALINK_SELECTOR).prepend('<span data-link="download/' + file.id + '" class="glyphicon glyphicon-link"></span>');
						component.bundle.files.push(file);


						var $link = $(result.previewElement).find('.glyphicon-link');
						$link.on('click', function() {
							copyToClipboard($link);
						});

					}
				}
			});

			component.dropzone.on('queuecomplete', function() {
				var files = this.files;
				var fileSize = _.reduce(files, function(memo, val) {
					return val.size + memo;
				}, 0);
				fileSize = fileSize / 1024 / 1024;
				//enable the send button
				if(component.bundle.files.length > 0) {
					$.post('/upload/bundle', {
						bundle: JSON.stringify(component.bundle)
					}).done(function() {
						component.$completedContainer.find('.btn.loading').removeClass('loading').attr('disabled', false).html("send");
						// Show the bundler file download if conditions are met
						if(files.length !== 1 || files[0].type !== "application/zip" || fileSize > 2000) {
							$(DROPZONE_PREVIEW_TEMPLATE_SELECTOR).prepend('<div class="dz-preview-bundle"> <span data-link="bundle/' + component.bundle.id + '/" class="glyphicon glyphicon-link bundle"></span> link to .zip file</div>');
						}
						// if(fileSize < 2000) {
						// }


						component.$completedContainer
								 .find('form')
								 .append('<input type="hidden" name="bundle" value="' + component.bundle.id + '" />');


						$('.dz-preview-bundle .glyphicon').on('click',  function(e) {
							copyToClipboard($(this));
						});
					});
				} else {

					$('.btn.loading').remove();
					component.$completedContainer.html('<br /><p class="text-danger">Oh my... something went wrong while transferring your files. Please try again later.</p><a href="/" data-async data-target="hp">Return to homepage</a>');
				}

				component.dropzone.disable();
			});

			component.dropzone.on("reset", function() {
				component.$element.removeClass("dz-files-added");
			});
		}
	});
}

// ------------------------------------------------------------------------------------------ Component Initialization

$(COMPONENT_SELECTOR).each(function(index, element) {
	return new Fileupload(element);
});

$(document).on('xhr.loaded', function(event, element, target) {
	$(target).find(COMPONENT_SELECTOR).each(function(index, item) {
		return new Fileupload(item);
	});
});

function copyToClipboard($glyphicon) {
	var $input = $("<input />");
	var url = $glyphicon[0].baseURI + $glyphicon.data('link');

	$('body').append($input);

	$input[0].value= url;
	$input[0].select();
	var once = _.once(alertMessage);
	try {
		var successful = document.execCommand('copy');
		once(successful, $input);
	}catch(err) {
		once(false, $input);

	}
}
function alertMessage(msg, $input) {
	var div = document.createElement("div");
	$(div).addClass('my_alert');
	document.body.appendChild(div);

	if(msg) {
		$input.css({
			left: "-9999em",
			position: "fixed"
		});
		$(div).html("<p>copied to clipboard!</p>");
		setTimeout(function() {
			$(div).fadeOut(function() {
				$(div).remove();
				$input.remove();
			});
		}, 1000);
	}else {
		$(div).append($input);
		$(div).append("<a class='glyphicon glyphicon-remove'></a>").on('click', '.glyphicon-remove', function() {
			$(div).fadeOut(function() {
				$(div).remove();
				 $input.remove();
			});
		});
	}
}






// ------------------------------------------------------------------------------------------ Component Exposure




module.exports = Fileupload;
