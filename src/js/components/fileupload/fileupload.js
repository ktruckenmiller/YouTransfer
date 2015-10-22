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
		console.log(component.$completedContainer.find('.btn.loading'));
		// .find('.btn.loading').attr('disabled', 'disabled');
	});
	$.getJSON('/settings/dropzone').done(function(settings) {
		var options = $.extend({
			url: '/upload',
			paramName: DROPZONE_PARAMETER,
			dictDefaultMessage: '<span class="glyphicon glyphicon-download-alt" style="font-size: 3em;"></span><br /><br /> drop all files here or click to select',
			dictFallbackMessage: '',

			previewTemplate: component.previewTemplate,
			previewsContainer: component.previewContainer,
			clickable: DROPZONE_ACTIONS_ADD_SELECTOR
		}, settings.dropzone);

		component.dropzone = new Dropzone(element, options);

		if(!settings.dropzone.forceFallback) {
			component.dropzone.on("addedfile", function() {
				component.$element.addClass("dz-files-added");
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
						$(result.previewElement).find(DROPZONE_PREVIEW_DATALINK_SELECTOR).prepend('<a href="/download/' + file.id + '"><span class="glyphicon glyphicon-download-alt"></span></a>');
						component.bundle.files.push(file);
					}
				}
			});

			component.dropzone.on('queuecomplete', function() {
				//enable the send button
				if(component.bundle.files.length > 0) {
					$.post('/upload/bundle', {
						bundle: JSON.stringify(component.bundle)
					}).done(function() {
						console.log("queue complete");
						component.$completedContainer.find('.btn.loading').removeClass('loading').attr('disabled', false).html("send");
						$(DROPZONE_PREVIEW_TEMPLATE_SELECTOR).prepend('<div class="dz-preview-bundle"> <a href="/bundle/' + component.bundle.id + '/"><span class="glyphicon glyphicon-download-alt"></span> download all files as a zip archive</a></div>');
						component.$completedContainer
								 .find('form')
								 .append('<input type="hidden" name="bundle" value="' + component.bundle.id + '" />');
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

// ------------------------------------------------------------------------------------------ Component Exposure

module.exports = Fileupload;
