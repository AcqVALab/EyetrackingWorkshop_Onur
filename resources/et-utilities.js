window.utilities = (function () {
    let module = {};
    let pictureFields = [];

    // IMPORTANT: These are the default options for the experiments,
    // review them if you need to change anything related to the experiment.
    //
    // If you want to override any variable, simply send it in the 'options' argument of the
    // prepareExperiment() function
    let default_options = {
        calibration_points: [
            [5,  5], [30,  5], [50,  5], [70,  5], [95,  5],
            [5, 50], [30, 50], [50, 50], [70, 50], [95, 50],
            [5, 95], [30, 95], [50, 95], [70, 95], [95, 95]],   // 15 point calibration
        calibration_mode: 'click',          // Click-by-click calibration
        clicks_per_point: 5,                // Have the user click on the calibration target 2 times before moving on to the next
        time_to_saccade: 1000,              // For 'view' mode calibration, assume it'll take 1 second for the target to saccade to the calibration point
        time_per_point: 1000,               // For 'view' mode calibration, have the subject fixate at the target for 1 second
        repetitions_per_point: 1,           // Repeat the calibration points just once
        randomize_calibration_order: false, // Do not randomize
        custom_calibration_target: null,    // Do not use custom image

        /* Calibration validation*/
        validation_duration: 5000,          // Show the validation point for 5 seconds
        minimum_calibration_precision: 60,  // Minimum calibration precision is 60
        maximum_tries: 3,                   // End experiment if calibration fails for 3 times

        /* Recalibration flow */
        recalibrate_after_n_seconds: 5 * 60,  // Recalibrate after 5 minutes
        recalibrate_after_n_trials: 10,     // Recalibrate after 10 trials

        /* Variables to specify for using custom HTML in experiment design */
        custom_html: null,                  // By default, do not provide any custom HTML
        response_css_selector: ".response", // The CSS selector to get list of response items in the default experiment HTML

        /* Specify the list of response keys, if you need to enable keyboard response */
        response_keys: jsPsych.NO_KEYS,     // Keyboard input disabled by default

        /* Experiment flow control variables */
        center_gaze_after_trial: true,      // Make sure the subject gaze is centered after each trial (i.e. yellow dot)
        single_response: true,              // Allow only one response
        response_ends_trial: true,          // Trial finishes after first response
        trial_ends_after_audio: false,      // Trial does not automatically end when the audio finishes playing
        response_allowed_while_playing: true,   // Subject can mark the response while the audio is still playing
        pictures_delay: 0,                  // The pictures are shown immediately, without delay
        audio_delay: 0,                     // The audio is played immediately, without delay
    }

    // Get the option with the given name from the user provided options dictionary
    let getOption = function (options, option_name) {
        if (typeof options === 'undefined') {
            options = {}
        }

        if (option_name in options) {
            return options[option_name];
        }
        return default_options[option_name];
    }

    let getHeadPositioningTrial = function (options) {
        return {
            type: "webgazer-init-camera",
            instructions: _("init_camera_instructions"),
            button_text: _("continue_button_label"),
            recalibrate_after_n_seconds: getOption(options, 'recalibrate_after_n_seconds'),
            recalibrate_after_n_trials: getOption(options, 'recalibrate_after_n_trials'),
        };
    }

    let getCalibrationTrial = function (options) {
        let calibration_target = getOption(options, 'custom_calibration_target');
        if(calibration_target !== null) {
            calibration_target = module.getStimuliURL(calibration_target);
        }
        return {
            type: 'webgazer-calibrate',
            calibration_points: getOption(options, 'calibration_points'),
            calibration_mode: getOption(options, 'calibration_mode'),
            clicks_per_point: getOption(options, 'clicks_per_point'),
            repetitions_per_point: getOption(options, 'repetitions_per_point'),
            randomize_calibration_order: getOption(options, 'randomize_calibration_order'),
            custom_calibration_target: calibration_target,
            time_to_saccade: getOption(options, 'time_to_saccade'),
            time_per_point: getOption(options, 'time_per_point'),
        }
    }

    let getValidationInstructionTrial = function (options) {
        return {
            type: 'html-button-response',
            stimulus: _("validation_instructions"),
            choices: [_("start_validation_button_label")],
            skip_if_calibration_validated: true,
        }
    }

    let getValidationTrial = function (options) {
        let calibration_target = getOption(options, 'custom_calibration_target');
        if(calibration_target !== null) {
            calibration_target = module.getStimuliURL(calibration_target);
        }
        return {
            type: 'webgazer-validate-single-point',
            validation_duration: getOption(options, 'validation_duration'),
            minimum_calibration_precision: getOption(options, 'minimum_calibration_precision'),
            maximum_tries: getOption(options, 'maximum_tries'),
            custom_calibration_target: calibration_target,
        }
    }

    let getExperimentTrial = function (trial_data, options) {
        let calibration_target = getOption(options, 'custom_calibration_target');
        if(calibration_target !== null) {
            calibration_target = module.getStimuliURL(calibration_target);
        }
        return {
            type: "eye-tracking",
            trial_data: trial_data,
            custom_html:            getOption(options, 'custom_html'),
            custom_calibration_target: calibration_target,
            response_css_selector:  getOption(options, 'response_css_selector'),
            response_keys:          getOption(options, 'response_keys'),
            center_gaze_after_trial:    getOption(options, 'center_gaze_after_trial'),
            single_response:        getOption(options, 'single_response'),
            response_ends_trial:    getOption(options, 'response_ends_trial'),
            trial_ends_after_audio: getOption(options, 'trial_ends_after_audio'),
            response_allowed_while_playing: getOption(options, 'response_allowed_while_playing'),
            pictures_delay:         getOption(options, 'pictures_delay'),
            audio_delay:            getOption(options, 'audio_delay'),

            extensions: [{
                type: 'webgazer',
                params: {
                    targets: [],
                    auto_initialize: true
                }
            }]
        };
    }

    // Parse the data loaded by the loadData() function.
    // For pictureN and audio columns, calculate the Gorilla stimuli URL automatically
    let parseData = function (data) {
        let parsedData = [];
        // Split data into lines
        let lines = data.split(/\r\n|\n/);
        // Get data headings
        let headings = lines[0].toLowerCase().split(',');

        for (let i = 1; i < lines.length; i++) {
            let linePieces = lines[i].toLowerCase().split(',');
            if (linePieces.length !== headings.length)
                break;
            let line_data = {};
            for (let j = 0; j < headings.length; j++) {
                let lineColumnData = linePieces[j];
                // Convert picture and audio columns from filename to stimuli URLs
                if (headings[j].startsWith("picture") || headings[j] === "audio") {
                    lineColumnData = module.getStimuliURL(lineColumnData);
                }
                // Convert the column data to integer or boolean (if possible)
                else if (!isNaN(lineColumnData))
                    lineColumnData = parseInt(lineColumnData);
                else if (lineColumnData.toLowerCase() === "y")
                    lineColumnData = true;
                else if (lineColumnData.toLowerCase() === "n")
                    lineColumnData = false;
                line_data[headings[j]] = lineColumnData
            }
            parsedData.push(line_data);
        }

        module.calculatePictureFields(parsedData[0])

        return parsedData;
    }


    // Load the CSV data from the given URL (or stimuli filename), and return the parsed array.
    // For the picture1, picture2, ..., pictureN, and audio columns, the Gorilla stimuli URL is calculated automatically
    module.loadData = function (dataUrl) {
        let dataContents = "";

        // If the dataUrl does not contain a slash, assume it's just the stimuli filename and calculate URL automatically
        if (!dataUrl.includes("/")) {
            dataUrl = module.getStimuliURL(dataUrl);
        }

        // The AJAX request has to be async, as all the rest depends on it
        $.ajax({
            type: "GET",
            url: dataUrl,
            dataType: "text",
            async: false,
            success: function (data) {
                dataContents = data;
            }
        });

        // Parse and return the loaded CSV data
        return parseData(dataContents);
    }

    // Randomly assign participant to a group according to the given field
    // Returns only the part of the data which corresponds to the assigned group according to the field
    //
    // E.g. if the data contains 3 different values in the given field, this function assigns the participant
    // to one of these field values and discards the trial data which belongs to remaining two field values
    module.randomAssign = function (data, field) {
        let dataGroups = module.splitAccordingToField(data, field);
        return dataGroups[Math.floor(Math.random() * dataGroups.length)];
    }

    module.splitAccordingToField = function (data, field) {
        let possibleValues = new Set();

        for (let v in data) {
            possibleValues.add(data[v][field]);
        }

        possibleValues = Array.from(possibleValues)

        let returnValue = [];
        for (let v in possibleValues) {
            returnValue.push(data.filter(el => el[field] === possibleValues[v]))
        }

        return returnValue;
    }

    // Randomly shuffle the data according to the given fields. For example, for the following data:
    //
    // Field1   Field2  Field3
    // 1        a       123
    // 1        b       234
    // 2        c       345
    // 2        c       456
    // 3        d       567
    //
    // The shuffle(data, [Field1, Field2, Field3] operation first separates the data into 3 groups (depending on Field1
    // field value). Then each group is sorted according to remaining fields ([Field2, Field3]) and the results are
    // joined in a random order (back in the Field1 level).
    // In the resulting data, the rows coming from Field1=1 are always contiguous (same as Field1=2 rows).
    module.shuffle = function (data, fields) {
        if (fields === null || fields.length === 0) {
            return jsPsych.randomization.shuffle(data);
        }

        let currentField = fields.shift()
        // Split data into groups, according to the current field
        let dataGroups = module.splitAccordingToField(data, currentField);
        // Sort each data groups according to the remaining fields
        for (let i in dataGroups) {
            dataGroups[i] = module.shuffle(dataGroups[i], fields)
        }

        // Shuffle the data groups
        return jsPsych.randomization.shuffle(dataGroups).flat();
    }

    module.round = function (number, decimals = 2) {
        let coeff = 10 ** decimals;
        return Math.round(number * coeff) / coeff;
    }

    module.getStimuliURL = function (stimuli_name) {
        if (typeof gorilla != 'undefined') {
            return gorilla.stimuliURL(stimuli_name);
        } else {
            return "./stimuli/" + stimuli_name;
        }
    }

    module.getStimuliName = function (stimuli_url) {
        let path_pieces = stimuli_url.split("/");
        return path_pieces[path_pieces.length - 1];
    }

    module.calculatePictureFields = function (firstTrial) {
        pictureFields = [];
        for (let property in firstTrial) {
            if (firstTrial.hasOwnProperty(property) &&
                property.toString().startsWith("picture")) {
                pictureFields.push(property);
            }
        }
    }

    module.getNumberOfPictures = function () {
        return pictureFields.length;
    }

    module.prepareExperiment = function (trials, practiceTrials = [], options = {}) {
        window.is_calibrated = false;

        let timeline = module.prepareTimeline(trials, options);
        let practiceTimeline = module.prepareTimeline(practiceTrials, options);

        // Collect image & audio files
        let imageFiles = new Set();
        let audioFiles = new Set();
        let allTrials = practiceTrials.concat(trials);
        for (let i = 0; i < allTrials.length; i++) {
            for (let field in pictureFields) {
                imageFiles.add(allTrials[i][field]);
            }
            audioFiles.add(allTrials[i]['audio']);
        }
        audioFiles.add(module.getStimuliURL("sound_check.mp3"))

        // TRACK MOUSE POSITION
        if (typeof window.mouse_pos_x === 'undefined') {
            window.mouse_pos_x = null;
            window.mouse_pos_y = null;
        }
        $("body").mousemove(function(e) {
            window.mouse_pos_x = e.pageX;
            window.mouse_pos_y = e.pageY;
        });

        return [timeline, practiceTimeline, Array.from(imageFiles), Array.from(audioFiles)];
    }

    module.prepareTimeline = function (trials, options) {
        // parameters.rt_method = (typeof parameters.rt_method === 'undefined') ? 'performance' : parameters.rt_method;

        // Add trials to the timeline
        let timeline = [];
        for (let num_trial = 0; num_trial < trials.length; num_trial++) {
            // Add a looping timeline for the eye-tracking experiment trial
            timeline.push({
                timeline: [
                    getHeadPositioningTrial(options),
                    getCalibrationTrial(options),
                    getValidationInstructionTrial(options),
                    getValidationTrial(options),
                    getExperimentTrial(trials[num_trial], options),
                ],
                loop_function: function () {
                    // Repeat while the calibration is lost
                    return !window.is_calibrated;
                }
            });
        }
        return timeline;
    }

    module.getCalibrationTimeline = function (options) {
        // Add a looping timeline for initial calibration
        return [{
            timeline: [
                getHeadPositioningTrial(options),
                getCalibrationTrial(options),
                getValidationInstructionTrial(options),
                getValidationTrial(options),
            ],
            loop_function: function () {
                // Repeat while the calibration is lost
                return !window.is_calibrated;
            }
        }];
    }

    return module;
})();
