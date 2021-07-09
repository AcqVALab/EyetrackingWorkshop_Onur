/**
 * jspsych-eye-tracking
 * a jsPsych plugin for eye-tracking experiments
 *
 * Onur Ferhat
 *
 */
jsPsych.plugins['eye-tracking'] = (function () {

    let plugin = {};

    plugin.info = {
        name: 'eye-tracking',
        description: '',
        parameters: {
            trial_data: {
                type: jsPsych.plugins.parameterType.COMPLEX,
                pretty_name: 'Trial data',
                default: null,
                description: 'Trial data coming from the CSV data source, including picture and audio details'
            },
            custom_html: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'Custom HTML',
                default: null,
                description: 'Custom HTML for experiment design.'
            },
            custom_calibration_target: {
                type: jsPsych.plugins.parameterType.IMAGE,
                default: null
            },
            /* OPTIONS FOR INPUTS */
            response_css_selector: {
                type: jsPsych.plugins.parameterType.STRING,
                array: true,
                pretty_name: 'Response CSS selector',
                default: ".response",
                description: 'The CSS selector (i.e. ".response") which is used to get the list of response items (buttons/images) in the HTML.'
            },
            response_keys: {
                type: jsPsych.plugins.parameterType.KEY,
                array: true,
                pretty_name: 'Response keys',
                default: jsPsych.NO_KEYS,
                description: 'The keys the subject is allowed to press to respond to the stimulus.'
            },
            /* OPTIONS FOR EXPERIMENT FLOW */
            center_gaze_after_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Center the gaze after the trial ends',
                default: true,
                description: 'If true, a yellow calibration target will be shown on the center of the screen, so that ' +
                    'the gaze is centered before the next trial.'
            },
            single_response: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Single response',
                default: true,
                description: 'If true, the user can only mark a single response.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, the trial will end when user makes a response.'
            },
            trial_ends_after_audio: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Trial ends after audio',
                default: false,
                description: 'If true, then the trial will end as soon as the audio file finishes playing.'
            },
            response_allowed_while_playing: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response allowed while playing',
                default: true,
                description: 'If true, then responses are allowed while the audio is playing. ' +
                    'If false, then the audio must finish playing before a response is accepted.'
            },
            pictures_delay: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Pictures delay',
                default: 0,
                description: 'The delay (in ms) after which the pictures are shown.'
            },
            audio_delay: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Audio delay',
                default: 0,
                description: 'The delay (in ms) after which the audio is played.'
            },
        }
    }

    plugin.trial = function (display_element, trial) {
        // setup stimulus
        let context = jsPsych.pluginAPI.audioContext();
        let audio;

        // Variables for the internal state
        let numPictures = utilities.getNumberOfPictures();
        let audioEnded = false;
        let participantResponses = [];
        let pictureBboxData = {};
        let startTime = null;
        let keyboardListener = null;

        // If the calibration was lost before this trial, finish the trial immediately
        // so that the looped calibration trial is executed
        if (!window.is_calibrated) {
            jsPsych.finishTrial({
                "calibration_lost": true
            });
            return;
        }

        // By default, use custom HTML passed from outside
        let html = trial.custom_html;

        // If there is no custom HTML, load the default designs for 1-2-3 images
        if(html === null) {
            // Single picture design (i.e. full screen)
            if (numPictures === 1) {
                html = `
                <div class="container-fluid" style="height: 100%;">
                    <div class="row" style="height: 100%;">
                        <div class="col-md-12 align-self-center">
                            <img id="picture1" src="{{PICTURE1}}" class="img-fluid response" data-response="picture1" style="display: none;">
                        </div>
                    </div>
                </div>`;
            }
            // Two-picture design (side-by-side)
            else if(numPictures === 2) {
                html = `
                <div class="container-fluid" style="height: 100%;">
                    <div class="row" style="height: 100%;">
                        <div class="col-md-4 offset-md-1 align-self-center">
                            <img id="picture1" src="{{PICTURE1}}" class="img-fluid response" data-response="picture1" style="display: none;">
                        </div>
                        <div class="col-md-2"></div>
                        <div class="col-md-4 align-self-center">
                            <img id="picture2" src="{{PICTURE2}}" class="img-fluid response" data-response="picture2" style="display: none;">
                        </div>
                    </div>
                </div>`;
            }
            // Three-picture design (custom design)
            else if (numPictures === 3) {
                html = `
                <div class="container-fluid" style="height: 100%;border: solid #FFF;border-width: 4vh 0.5vw 4vh 0.5vw;">
                    <div class="row" style="height: 48%;">
                        <div class="col-md-4" style="height: 100%">
                            <img id="picture1" src="{{PICTURE1}}" class="img-fluid response" data-response="picture1" style="display: none;height: 100%;">
                        </div>
                        <div class="col-md-4 offset-md-4" style="height: 100%">
                            <img id="picture2" src="{{PICTURE2}}" class="img-fluid response" data-response="picture2" style="display: none;height: 100%;">
                        </div>
                    </div>
                    <div class="separator-row" style="height: 6%;">
                    </div>
                    <div class="row" style="height: 48%;">
                        <div class="col-md-4 offset-md-4" style="height: 100%">
                            <img id="picture3" src="{{PICTURE3}}" class="img-fluid response" data-response="picture3" style="display: none;height: 100%;">
                        </div>
                    </div>
                </div>`;
            }
            // Four-picture design (custom design)
            else if (numPictures === 4) {
                html = `
                <div class="container-fluid" style="height: 100%;border: solid #FFF;border-width: 4vh 0.5vw 4vh 0.5vw;">
                    <div class="row" style="height: 48%;">
                        <div class="col-md-4" style="height: 100%">
                            <img id="picture1" src="{{PICTURE1}}" class="img-fluid response" data-response="picture1" style="display: none;height: 100%;">
                        </div>
                        <div class="col-md-4 offset-md-4" style="height: 100%">
                            <img id="picture2" src="{{PICTURE2}}" class="img-fluid response" data-response="picture2" style="display: none;height: 100%;">
                        </div>
                    </div>
                    <div class="separator-row" style="height: 6%;">
                    </div>
                    <div class="row" style="height: 48%;">
                        <div class="col-md-4" style="height: 100%">
                            <img id="picture3" src="{{PICTURE3}}" class="img-fluid response" data-response="picture3" style="display: none;height: 100%;">
                        </div>
                        <div class="col-md-4 offset-md-4" style="height: 100%">
                            <img id="picture4" src="{{PICTURE4}}" class="img-fluid response" data-response="picture4" style="display: none;height: 100%;">
                        </div>
                    </div>
                </div>`;
            }
        }

        // Replace templates (i.e. {{PICTURE1}}) with actual values coming from the trial
        for(let i=1; i<=numPictures; i++) {
            let field = `picture${i}`
            html = html.replaceAll("{{" + field.toUpperCase() + "}}", trial.trial_data[field]);
        }
        display_element.innerHTML = html;

        // start time
        initializeTrial();

        // Initialize the trial by loading the audio, and setting the face lost listener
        function initializeTrial() {
            jsPsych.pluginAPI.getAudioBuffer(trial.trial_data.audio)
                .then(function (buffer) {
                    if (context !== null) {
                        audio = context.createBufferSource();
                        audio.buffer = buffer;
                        audio.connect(context.destination);
                    } else {
                        audio = buffer;
                        audio.currentTime = 0;
                    }
                    setupTrial();
                })
                .catch(function (err) {
                    console.log(err);
                    console.error('Audio file failed to load')
                });

            //console.log("Setting face lost listener")
            webgazer.setFaceLostListener(onFaceLost);
            //jsPsych.extensions['webgazer'].resume();
            //jsPsych.extensions.webgazer.startSampleInterval();
        }

        // Setup the trial. Should handle the options:
        // - response_allowed_while_playing: Whether the actions will be blocked until the audio has finished
        // - pictures_delay: Whether to add any delay for displaying the pictures:
        // - audio_delay: Whether to add any delay for playing the audio (relative to the time the pictures are displayed)
        function setupTrial() {
            // Start tracking the time once the audio is already loaded and the experiment is starting
            startTime = performance.now() / 1000;

            // If response is allowed while playing, enable it
            if(trial.response_allowed_while_playing) {
                enableResponse();
            }

            // Set a timeout to show the pictures
            jsPsych.pluginAPI.setTimeout(showImages, trial.pictures_delay);

            // Set a timeout to play the audio
            jsPsych.pluginAPI.setTimeout(playAudio, trial.audio_delay);
        }

        // Enable the responses when it's time
        // For now, only the picture click response is enabled.
        function enableResponse() {
            // Get all response items
            let responseItems = $(trial.response_css_selector);

            // Add the CSS class to make them appear "clickable"
            responseItems.addClass("selection-enabled");

            // Add event listeners to responseItems
            responseItems.click(function (e) {
                let clickedItem = $(e.target);
                $(trial.response_css_selector).removeClass("selected");
                clickedItem.addClass("selected");
                onResponse(clickedItem.data('response'));
            });

            // start the response listener
            if (trial.response_keys !== jsPsych.NO_KEYS) {
                keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
                    callback_function: function(response) {onResponse(response.key)},
                    valid_responses: trial.response_keys,
                    persist: true,
                    allow_held_key: false
                });
            }
        }

        // Disable the responses
        function disableResponse() {
            let responseItems = $(trial.response_css_selector)
            responseItems.removeClass("selection-enabled");
            responseItems.off('click');

            // kill keyboard listeners
            if (keyboardListener !== null) {
                jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
            }
        }

        // Show the images (which are hidden initially)
        function showImages() {
            $(".img-fluid").show();
        }

        // Start playing the audio, and attach its 'ended' event listener so that we can tell
        // when the audio has finished playing
        function playAudio() {
            // Attach event listener
            audio.addEventListener('ended', onAudioEnded);

            // Start audio
            if (context !== null) {
                audio.start(context.currentTime);
            } else {
                audio.play();
            }
        }

        // Stop the audio
        function stopAudio() {
            if (context !== null) {
                audio.stop();
            } else {
                audio.pause();
            }
        }

        // Event handler to detect when the audio has finished playing
        // Marks the 'audioEnded' variable, enables the response (if not enabled at the start) and triggers a state check
        function onAudioEnded() {
            audioEnded = true;

            if(!trial.response_allowed_while_playing) {
                enableResponse()
            }
            checkIfTrialShouldEnd();
        }

        // Event handler for user response events (i.e. clicking the images, etc.)
        function onResponse(choice) {
            let response = {
                "response": choice,
                "time": utilities.round((performance.now() / 1000) - startTime, 3)
            }

            // If the data coming from CSV has a 'correct_answer' field, compare it with subject choice
            // and decide if it was correct or not
            if (typeof trial.trial_data.correct_answer !== 'undefined' && trial.trial_data.correct_answer !== "") {
                response["is_correct"] = choice === trial.trial_data.correct_answer;
            }

            // If the trial is configured to allow only a single response, disable the responses
            if (trial.single_response) {
                disableResponse();
            }

            participantResponses.push(response);

            // Calculate & save the picture bounding boxes
            for(let i=1; i<=numPictures; i++) {
                let picture = "picture" + i;
                let picture_rect = $("#" + picture)[0].getBoundingClientRect();
                let picture_bbox = {
                    "top": utilities.round(picture_rect.top),
                    "right": utilities.round(picture_rect.right),
                    "bottom": utilities.round(picture_rect.bottom),
                    "left": utilities.round(picture_rect.left)
                };

                pictureBboxData[picture + "_name"] = utilities.getStimuliName(trial.trial_data[picture]);
                pictureBboxData[picture + "_bbox"] = picture_bbox;
            }

            checkIfTrialShouldEnd();
        }

        // Event handler to process face lost events (i.e. subject leaving the camera view)
        // Shows a popup that notifies the subject, and waits for a button click to switch back to the calibration trial
        function onFaceLost() {
            clearEvents()

            // Mark the eye-tracker as not calibrated, and stop the audio (if it was playing)
            window.is_calibrated = false;
            stopAudio();

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
                let trial_data = {
                    "start_time": utilities.round(startTime, 3),
                    "trial_id": trial.id,
                    "calibration_lost": true
                };
                jsPsych.finishTrial(trial_data);
            });
        }

        // Decide whether the trial is finished or not
        // - If the calibration is lost, it finishes the trial immediately
        // - If the audio has ended, and the
        function checkIfTrialShouldEnd() {
            if (!window.is_calibrated) {
                jsPsych.finishTrial({
                    "calibration_lost": true
                });
                return;
            }

            // Decide whether the trial should end or not
            let should_end = false;
            // 1) If the trial should end once the audio is finished, and the audio already ended, it SHOULD END
            if (trial.trial_ends_after_audio && audioEnded) {
                should_end = true;
            }
            // 2) If the trial should end after first response, and there is already a response, it SHOULD END
            else if (trial.response_ends_trial && participantResponses.length !== 0) {
                should_end = true;
            }
            // 3) If the audio has finished, and there is already a response, it SHOULD END
            else if (audioEnded && participantResponses.length !== 0) {
                should_end = true;
            }

            // If we have decided that the trial should end, do it
            if (should_end) {
                // Stop the gaze listener
                //jsPsych.extensions.webgazer.stopSampleInterval()

                // Stop the audio file if it is playing
                stopAudio()

                // If the gaze center option is marked, first show the center dot
                if (trial.center_gaze_after_trial)
                    showCenterDot();
                else
                    endTrial();
            }
        }

        // Replace the display element contents with a centered calibration point, so that the subject's gaze
        // is centered after the trial
        function showCenterDot() {
            var additional_style = ""
            if(trial.custom_calibration_target !== null) {
                additional_style = `background-image: url('${trial.custom_calibration_target}') repeat center; border: none;`
            }
            // Update the display element
            display_element.innerHTML = `<div id="calibration-point" style="background-color: yellow; left:50%; top:50%; ${additional_style}"></div>`;

            // When the calibration point is clicked, end the trial
            $("#calibration-point").click(endTrial);
        }

        function clearEvents() {
            // Kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // Kill keyboard listeners
            jsPsych.pluginAPI.cancelAllKeyboardResponses();

            // Stop the face lost listener
            webgazer.clearFaceLostListener();

            // Remove the audio event listener
            audio.removeEventListener('ended', onAudioEnded);
        }

        // End trial when it is time
        function endTrial() {
            clearEvents();

            // gather the data to store for the trial
            let data = {
                "start_time": utilities.round(startTime, 3),
                "audio": utilities.getStimuliName(trial.trial_data.audio),
                "responses": participantResponses
            };

            // clear the display
            display_element.innerHTML = '';

            data = {
                ...trial.trial_data,
                ...pictureBboxData,
                ...data
            }

            // Merge the original trial data coming from the CSV and the calculated data
            jsPsych.finishTrial(data);
        }
    };

    return plugin;
})();
