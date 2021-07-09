/**
 * jspsych-webgazer-calibrate
 * Josh de Leeuw
 **/

jsPsych.plugins["webgazer-calibrate"] = (function () {

    var plugin = {};

    plugin.info = {
        name: 'webgazer-calibrate',
        description: '',
        parameters: {
            calibration_points: {
                type: jsPsych.plugins.parameterType.INT,
                default: [[10, 10], [10, 50], [10, 90], [50, 10], [50, 50], [50, 90], [90, 10], [90, 50], [90, 90]]
            },
            calibration_mode: {
                type: jsPsych.plugins.parameterType.STRING,
                default: 'click', // options: 'click', 'view'
            },
            clicks_per_point: {
                type: jsPsych.plugins.parameterType.INT,
                default: 5
            },
            time_to_saccade: {
                type: jsPsych.plugins.parameterType.INT,
                default: 1000
            },
            time_per_point: {
                type: jsPsych.plugins.parameterType.STRING,
                default: 1000
            },
            repetitions_per_point: {
                type: jsPsych.plugins.parameterType.INT,
                default: 5
            },
            randomize_calibration_order: {
                type: jsPsych.plugins.parameterType.BOOL,
                default: false
            },
            custom_calibration_target: {
                type: jsPsych.plugins.parameterType.IMAGE,
                default: null
            },
            // Custom options for the calibration function
            skip_if_calibrated: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Skip if already calibrated',
                default: true,
                description: 'Whether to skip calibration if the system is already calibrated.'
            },
        }
    }

    plugin.trial = function (display_element, trial) {
        if(trial.skip_if_calibrated && window.is_calibrated) {
            jsPsych.finishTrial({
                "already_calibrated": true
            });
            return;
        }


        var html = `
        <div id='webgazer-calibrate-container' style='position: relative; width:100vw; height:100vh'>
        </div>`

        display_element.innerHTML = html;

        var wg_container = display_element.querySelector('#webgazer-calibrate-container');

        var reps_completed = 0;
        var points_completed = -1;
        var cal_points = null;

        // Add face lost event handler
        jsPsych.pluginAPI.setTimeout(function() {
            webgazer.setFaceLostListener(on_face_lost)
        }, 1000);

        calibrate();

        function calibrate() {
            jsPsych.extensions['webgazer'].hideVideo();
            jsPsych.extensions['webgazer'].resume();
            if (trial.calibration_mode === 'click') {
                jsPsych.extensions['webgazer'].startMouseCalibration();
            }
            next_calibration_round();
        }

        // Event handler to process face lost events (i.e. subject leaving the camera view)
        // Shows a popup that notifies the subject, and waits for a button click to switch back to the calibration trial
        function on_face_lost() {
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

        function next_calibration_round() {
            if (trial.randomize_calibration_order) {
                cal_points = jsPsych.randomization.shuffle(trial.calibration_points);
            } else {
                cal_points = trial.calibration_points;
            }
            points_completed = -1;
            next_calibration_point();
        }

        function next_calibration_point() {
            points_completed++;
            if (points_completed === cal_points.length) {
                reps_completed++;
                if (reps_completed === trial.repetitions_per_point) {
                    calibration_done();
                } else {
                    next_calibration_round();
                }
            } else {
                var pt = cal_points[points_completed];
                calibration_display_gaze_only(pt);
            }
        }

        function calibration_display_gaze_only(pt) {
            var additional_style = ""
            if(trial.custom_calibration_target !== null) {
                additional_style = `background-image: url('${trial.custom_calibration_target}'); border: none;`
            }
            var pt_html = `<div id="calibration-point" style="left:${pt[0]}%; top:${pt[1]}%; opacity: 50%; ${additional_style}"></div>`
            wg_container.innerHTML = pt_html;

            var pt_dom = wg_container.querySelector('#calibration-point');

            if (trial.calibration_mode === 'click') {
                pt_dom.style.cursor = 'pointer';
                pt_dom.addEventListener('click', function () {
                    pt_dom.style.opacity = parseFloat(pt_dom.style.opacity) + 0.5001/trial.clicks_per_point;
                    if(parseFloat(pt_dom.style.opacity) >= 1.0) {
                        next_calibration_point();
                    }
                })
            }

            if (trial.calibration_mode === 'view') {
                var br = pt_dom.getBoundingClientRect();
                var x = br.left + br.width / 2;
                var y = br.top + br.height / 2;

                var pt_start_cal = performance.now() + trial.time_to_saccade;
                var pt_finish = performance.now() + trial.time_to_saccade + trial.time_per_point;

                requestAnimationFrame(function watch_dot() {

                    if (performance.now() > pt_start_cal) {
                        jsPsych.extensions['webgazer'].calibratePoint(x, y, 'click');
                    }
                    if (performance.now() < pt_finish) {
                        requestAnimationFrame(watch_dot);
                    } else {
                        next_calibration_point();
                    }
                })
            }
        }

        function calibration_done() {
            if (trial.calibration_mode === 'click') {
                jsPsych.extensions['webgazer'].stopMouseCalibration();
            }
            window.is_calibrated = true;
            window.needs_validation = true;
            wg_container.innerHTML = "";
            end_trial();
        }

        // function to end trial when it is time
        function end_trial() {
            jsPsych.extensions['webgazer'].pause();
            jsPsych.extensions['webgazer'].hidePredictions();
            jsPsych.extensions['webgazer'].hideVideo();

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // Reset these variables which control when the next calibration will be done
            window.num_trials_without_calibration = 1;
            window.last_calibration_time = performance.now();

            // clear the display
            display_element.innerHTML = '';

            // move on to the next trial
            jsPsych.finishTrial();
        };

    };

    return plugin;
})();