/*
 * Copy the contents of this file to your 'main' section of your "Code Editor Task" on Gorilla.
 *
 * Afterwards, apply any customizations.
*/
import gorilla = require("gorilla/gorilla");

var jsPsych = window['jsPsych'];

gorilla.ready(function() {
    // TODO Update the translations.json file and place the translations/corrections
    // Load translations from JSON file
    _.loadTranslations('translations.json');

    // TODO Change the data URLs
    let practiceTrials = utilities.loadData('practice.csv')
    let trials = utilities.loadData('data.csv')

    // TODO Decide if you want to shuffle your data
    // Shuffle the non-practice trials according to two fields
    utilities.shuffle(trials, ["counterbalance", "block"])

    // TODO Apply any custom experiment options
    let experimentOptions = {
        // calibration_points: [
        //     [5,  5], [30,  5], [50,  5], [70,  5], [95,  5],
        //     [5, 50], [30, 50], [50, 50], [70, 50], [95, 50],
        //     [5, 95], [30, 95], [50, 95], [70, 95], [95, 95]],   // 15 point calibration
        // calibration_mode: 'click',          // Click-by-click calibration
        // clicks_per_point: 5,                // Have the user click on the calibration target 2 times before moving on to the next
        // time_to_saccade: 1000,              // For 'view' mode calibration, assume it'll take 1 second for the subject to saccade to the calibration point
        // time_per_point: 1000,               // For 'view' mode calibration, have the subject fixate at the target for 1 second
        // repetitions_per_point: 1,           // Repeat the calibration points just once
        // randomize_calibration_order: false, // Do not randomize
        // custom_calibration_target: null,    // Do not use custom calibration target image
        //
        // /* Calibration validation*/
        // validation_duration: 5000,          // Show the validation point for 5 seconds
        // minimum_calibration_precision: 60,  // Minimum calibration precision is 60
        // maximum_tries: 3,                   // End experiment if calibration fails for 3 times
        //
        // /* Recalibration flow */
        // recalibrate_after_n_seconds: 5 * 60,  // Recalibrate after 5 minutes
        // recalibrate_after_n_trials: 10,     // Recalibrate after 10 trials
        //
        // /* Variables to specify for using custom HTML in experiment design */
        // custom_html: null,                  // By default, do not provide any custom HTML
        // response_css_selector: ".response", // The CSS selector to get list of response items in the default experiment HTML
        //
        // /* Specify the list of response keys, if you need to enable keyboard response */
        // response_keys: jsPsych.NO_KEYS,     // Keyboard input disabled by default
        //
        // /* Experiment flow control variables */
        // center_gaze_after_trial: true,      // Make sure the subject gaze is centered after each trial (i.e. yellow dot)
        // single_response: true,              // Allow only one response
        // response_ends_trial: true,          // Trial finishes after first response
        // trial_ends_after_audio: false,      // Trial does not automatically end when the audio finishes playing
        // response_allowed_while_playing: true,   // Subject can mark the response while the audio is still playing
        // pictures_delay: 0,                  // The pictures are shown immediately, without delay
        // audio_delay: 0,                     // The audio is played immediately, without delay
    }

    let experimentDetails = utilities.prepareExperiment(trials, practiceTrials, experimentOptions);
    let experimentTimeline = experimentDetails[0];
    let practiceTimeline = experimentDetails[1];
    let imageFiles = experimentDetails[2];
    let audioFiles = experimentDetails[3];

    let timeline = [];
    // Check browser compatibility
    timeline.push({
        type: "browser-check",
        test_audio: gorilla.stimuliURL("sound_check.mp3"),
    });

    // Enter fullscreen mode
    timeline.push({
        type: 'fullscreen',
        fullscreen_mode: true,
    });

    // Pre-practice message
    timeline.push({
        type: "html-button-response",
        stimulus: " <h2>PRACTICE</h2>\
        <p>Click the button below to start the practice session.</p>",
        choices: ["START"],
    });

    // Add practice trials to the end of timeline
    timeline = timeline.concat(practiceTimeline);

    // Pre-experiment message
    timeline.push({
        type: "html-button-response",
        stimulus: "<h2>EXPERIMENT</h2>\
        <p>Click the button below to start the experiment session.</p>",
        choices: ["START"],
    });


    // Add experiment trials to the end of timeline
    timeline = timeline.concat(experimentTimeline);

    /* start the experiment */
    jsPsych.init({
        display_element: typeof gorilla != 'undefined' ? $('#gorilla')[0] : undefined,
        timeline: timeline,
        extensions: [
          {type: 'webgazer'}
        ],
        preload_images: imageFiles,
        preload_audio: audioFiles,
        show_preload_progress_bar: true,
        on_data_update: function(data) {
            if (typeof gorilla != 'undefined') {
                gorilla.metric(data);
            }
        },
        on_finish: function() {
            Swal.fire({
                title: "Experiment has finished",
                text: "Thanks for your participation. You can now close this window.",
                width: 600,
                allowOutsideClick: false,
                showCancelButton: false,
                confirmButtonText: "OK",
            }).then((result) => {
                ;
            });
            if (typeof gorilla != 'undefined') {
                gorilla.finish();
            }
        }
    });
})
