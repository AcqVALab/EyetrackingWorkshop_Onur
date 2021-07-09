/**
 * jspsych-webgazer-validate-single-point
 * Onur Ferhat
 **/

jsPsych.plugins["webgazer-validate-single-point"] = (function () {

    let plugin = {};

    plugin.info = {
        name: 'webgazer-validate-single-point',
        description: '',
        parameters: {
            time_to_saccade: {
                type: jsPsych.plugins.parameterType.INT,
                default: 1000
            },
            validation_duration: {
                type: jsPsych.plugins.parameterType.INT,
                default: 5000
            },
            minimum_calibration_precision: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Minimum required precision for the calibration',
                default: 60,
                description: 'The minimum precision the calibration should have to let the user continue with the experiment. If the measure was lower than this value, the calibration will be repeated.'
            },
            maximum_tries: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Maximum number of calibration retries',
                default: 3,
                description: 'The maximum number of times the calibration can be repeated. If the subject still cannot achieve the required calibration, the experiment will be terminated.'
            },
            custom_calibration_target: {
                type: jsPsych.plugins.parameterType.IMAGE,
                default: null
            },
        }
    }

    plugin.trial = function (display_element, trial) {
        // Only do the validation when the system is recently calibrated
        if (window.needs_validation !== true) {
            jsPsych.finishTrial();
            return;
        }

        window.needs_validation = false;

        let trial_data = {}
        trial_data.raw_gaze = [];
        trial_data.percent_in_roi = [];
        trial_data.average_offset = [];

        display_element.innerHTML = `
      <div id='webgazer-validate-container' style='position: relative; width:100vw; height:100vh; overflow: hidden;'>
      </div>`;

        let wg_container = display_element.querySelector('#webgazer-validate-container');

        let start = performance.now();

        webgazer.setFaceLostListener(onFaceLost);

        validate();

        function validate() {
            jsPsych.extensions.webgazer.startSampleInterval();
            validation_display();
        }

        function validation_display() {
            wg_container.innerHTML = drawValidationPoint();

            let pt_dom = wg_container.querySelector('#validation-point');

            let br = pt_dom.getBoundingClientRect();
            let x = br.left + br.width / 2;
            let y = br.top + br.height / 2;

            let pt_start_val = performance.now() + trial.time_to_saccade;
            let pt_finish = pt_start_val + trial.validation_duration;

            let cancelGazeUpdate = jsPsych.extensions['webgazer'].onGazeUpdate(function (prediction) {
                if (performance.now() > pt_start_val) {
                    trial_data.raw_gaze.push({
                        x: prediction.x,
                        y: prediction.y,
                        dx: prediction.x - x,
                        dy: prediction.y - y,
                        t: Math.round(prediction.t - start)
                    });
                }
            });

            requestAnimationFrame(function watch_dot() {
                if (performance.now() < pt_finish) {
                    requestAnimationFrame(watch_dot);
                } else {
                    cancelGazeUpdate();

                    validation_done();
                }
            });

        }


        // Event handler to process face lost events (i.e. subject leaving the camera view)
        // Shows a popup that notifies the subject, and waits for a button click to switch back to the calibration trial
        function onFaceLost() {
            // Clear the listener so that the callback isn't executed several times
            webgazer.clearFaceLostListener();

            // Mark the eye-tracker as not calibrated, and stop the audio (if it was playing)
            window.is_calibrated = false;

            // Show a popup message and wait for the "OK" button click
            Swal.fire({
                title: _("calibration_lost_dialog_title"),
                html: _("calibration_lost_dialog_text"),
                width: 600,
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                showCancelButton: false,
                confirmButtonText: _("ok_button_label"),
            }).then(() => {
                jsPsych.finishTrial({
                    "calibration_lost": true
                });
            });
        }

        function drawValidationPoint() {
            var additional_style = ""
            if(trial.custom_calibration_target !== null) {
                additional_style = `background-image: url('${trial.custom_calibration_target}') repeat center; border: none;`
            }
            return `<div id="validation-point" style="left:50%; top:50%; ${additional_style}"></div>`
        }

        function calculatePrecision() {
            let sumPrecision = 0;
            let halfWindowHeight = $(window).height() / 2;

            for (let j = 0; j < trial_data.raw_gaze.length; j++) {
                let xDiff = trial_data.raw_gaze[j]["dx"];
                let yDiff = trial_data.raw_gaze[j]["dy"];
                // Calculate distance between each prediction and staring point
                let distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

                // Calculate precision percentage
                let precision = 0;
                if (distance <= halfWindowHeight && distance > -1) {
                    precision = 100 - (distance / halfWindowHeight * 100);
                } else if (distance > halfWindowHeight) {
                    precision = 0;
                } else if (distance > -1) {
                    precision = 100;
                }

                // Store the precision
                sumPrecision += precision;
            }

            // Return the precision measurement as a rounded percentage
            if (trial_data.raw_gaze.length > 0) {
                return Math.round(sumPrecision / trial_data.raw_gaze.length);
            } else {
                return 0;
            }
        }

        function validation_done() {
            let precision = calculatePrecision();
            console.log("Precision was: " + precision);
            end_trial(precision);
        }

        // function to end trial when it is time
        function end_trial(precision) {
            let success = precision >= trial.minimum_calibration_precision;

            if (window.calibration_validation_repetitions == null){
                window.calibration_validation_repetitions = 0;
            }

            jsPsych.extensions.webgazer.stopSampleInterval();

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // Stop the face lost listener
            webgazer.clearFaceLostListener();

            // clear the display
            display_element.innerHTML = '';

            if (success) {
                window.calibration_validation_repetitions = 0;
                // move on to the next trial
                jsPsych.finishTrial({
                    "calibration_precision": precision
                });
            } else {
                window.calibration_validation_repetitions += 1;
                window.is_calibrated = false;
                if (window.calibration_validation_repetitions >= trial.maximum_tries) {
                    Swal.fire({
                        title: _("calibration_max_retries_reached_title"),
                        text: _("calibration_max_retries_reached_text").replace("{}", trial.maximum_tries),
                        width: 600,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        allowEnterKey: false,
                        showCancelButton: false,
                        confirmButtonText: _("ok_button_label"),
                    }).then(() => {
                        jsPsych.endExperiment(_("calibration_max_retries_reached_text").replace("{}", trial.maximum_tries));
                    });
                }
                else {
                    Swal.fire({
                        title: _("calibration_not_validated_title"),
                        text: _("calibration_not_validated_text"),
                        width: 600,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        allowEnterKey: false,
                        showCancelButton: false,
                        confirmButtonText: _("ok_button_label"),
                    }).then(() => {
                        jsPsych.finishTrial();
                    });
                }
            }


        }

    };

    return plugin;
})();