/*!
 *
 *  ICU License Information
 *
 *  Copyright (c) 1995-2009 International Business Machines Corporation and others. All rights reserved.
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 *  documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 *  the rights to use, copy, modify, merge, publish, distribute, and/or sell copies of the Software, and to permit
 *  persons to whom the Software is furnished to do so, provided that the above copyright notice(s) and this permission
 *  notice appear in all copies of the Software and that both the above copyright notice(s) and this permission notice
 *  appear in supporting documentation.
 *
 */
(function() {

	let translate = function(text)
	{
		let xlate = translateLookup(text);
		
		if (typeof xlate == "function")
		{
			xlate = xlate.apply(this, arguments);
		}
		else if (arguments.length > 1)
		{
			let aps = Array.prototype.slice;
			let args = aps.call( arguments, 1 );
  
			xlate = formatter(xlate, args);
		}
		
		return xlate;
	};
	
	// I want it available explicitly as well as via the object
	translate.translate = translate;
	
	//from https://gist.github.com/776196 via http://davedash.com/2010/11/19/pythonic-string-formatting-in-javascript/ 
	let defaultFormatter = (function() {
		let re = /\{([^}]+)\}/g;
		return function(s, args) {
			return s.replace(re, function(_, match){ return args[match]; });
		}
	}());
	let formatter = defaultFormatter;
	translate.setFormatter = function(newFormatter)
	{
		formatter = newFormatter;
	};
	
	translate.format = function()
	{
		let aps = Array.prototype.slice;
		let s = arguments[0];
		let args = aps.call( arguments, 1 );
  
		return formatter(s, args);
	};

    // Load the translation data from the given URL (or stimuli filename)
    translate.loadTranslations = function (dataUrl) {
        // If the dataUrl does not contain a slash, assume it's just the stimuli filename and calculate URL automatically
        if (!dataUrl.includes("/")) {
            dataUrl = utilities.getStimuliURL(dataUrl);
        }

        $.ajax({
            type: "GET",
            url: dataUrl,
            dataType: "json",
            async: false,
            success: function (data) {
            	translate.setTranslation(data);
            }
        });
    }

	let translation = null;
	translate.setTranslation = function(newTranslation)
	{
		translation = newTranslation;
	};
	
	function translateLookup(target)
	{
		if (translation == null || target == null)
		{
			return target;
		}

		if (!(target in translation))
		{
			return target;
		}
		
		let result = translation[target];
		if (result == null)
		{
			return target;
		}
		
		return result;
	};
	
	window._ = translate;

})();