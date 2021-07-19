# Eye-Tracking Experiments for Gorilla
This repository contains the source code for modules used in eye-tracking experiments on the Gorilla platform.

A video recorded during the workshop can be watched [here](https://www.youtube.com/watch?v=bkNe61SAOKk).

## Gorilla Project Configuration
- Create a new "Code Editor Task" on Gorilla
- Paste the contents of `MAIN.js` file in the 'Code > main' section of your task
- Paste the contents of `HEAD.html` in the "Advanced > Head" section of your task
- Update the `stimuli/translations.json` for your use. Make sure you only update the values, and not the JSON keys themselves (i.e. do not modify the `ok_button_label` key, but modify the `OK` value)
- Upload the contents of `stimuli` folder to the "Uploads > Stimuli" section of your task
- Upload the contents of `resources` folder to the "Uploads > Resources" section of your task
- Upload your audio files (in MP3 format) and images (preferably in JPG/PNG format) to the "Uploads > Stimuli" section of your task
- Prepare your data file according to the references included under `examples/stimuli` folder. At a bare minimum, it should contain columns for:
    - `id`: A unique trial ID
    - `picture1`, ... `pictureN`: Pictures to be shown in the trial. For example, if you want to show 3 pictures in your experiment, include `picture1`, `picture2` and `picture3`     columns
    - `audio`: Audio to be played during the trial.
- If you want to include any extra information, add them to new columns. These will be directly exported as Gorilla metrics during the experiments.
- If you want to specify practice trials before the actual experiment, create a similar data file with only the practice trials
- Upload your data files to the "Uploads > Stimuli" section of your task
- Define your metrics under "Experiment > Metrics" section of your task. The metrics available for the eye-tracking experiments are:
    - All the columns from your data files
    - `start_time`: Start time of the trial, w.r.t. the experiment start
    - `responses`: User responses during the experiment
    - `pictureN_name`: Filename of the Nth picture (one metric for each picture)
    - `pictureN_bbox`: Bounding box for the Nth picture (one metric for each picture)
    - `webgazer_data`: Gaze data for the trial.
    - `calibration_lost`: Specifies that the calibration was lost (i.e. subject face disappeared from camera view) during that trial.
    - `already_calibrated`: Whether the calibration was skipped because system was already calibrated.
    - `calibration_precision`: Calibration precision calculated during a validation trial.
    
   
If any of the aforementioned sections is not visible in the Gorilla UI, go to "Configuration > Toolbox" to enable it.

## Customizations
For customizing your experiment, these are the most obvious and easy ways:
- In `MAIN.js`, apply your custom experiment options. The available options are:
    - `calibration_points`: The set of calibration points (in % of the screen width & height) to use during calibration.
    - `calibration_mode`: The calibration mode, either `click` for click-by-click calibration (by default) or `view` for calibration by only looking at calibration points.
    - `clicks_per_point`: For `click` mode, decides how many times the subject needs to click on the calibration point to advance to the next point.
    - `time_to_saccade`: For `view` mode, decides how long (in ms) it would take the target to saccade to the newly displayed calibration point. The calibration will ignore the data coming from the first `N` ms after a new calibration point is displayed.
    - `time_per_point`: For `view` mode, decides how long the calibration point will be displayed after the initial time to saccade. For example, if `time_to_saccade` is set to 1000ms and `time_per_point` to 2000ms, the calibration point will be displayed for a total of 3 seconds and the first second will be ignored by the calibration.
    - `repetitions_per_point`: For both calibration modes, how many times to repeat the entire set of calibration points.
    - `randomize_calibration_order`: Whether the calibration point order should be randomized or not.
    - `custom_calibration_target`: If you want to use a custom calibration target (i.e. a 'duck' image), the name of the image file (i.e. `duck.jpg`) in your stimuli directory. This image should be of 30x30 size. 
    - `validation_duration`: How long (in ms) to show the validation point after a calibration.
    - `minimum_calibration_precision`: The minimum validation precision for a calibration to be considered successful.
    - `maximum_tries`: How many times the subject can retry the calibration, if the precision is below the minimum during validation.
    - `recalibrate_after_n_seconds`: How often (in seconds) the system should be recalibrated during experiments.
    - `recalibrate_after_n_trials`: How often (in number of experiment trials) the system should be recalibrated during experiments. These two options can be used together, and whichever holds true first takes effect.
    - `custom_html`: Custom HTML to use for the displaying an experiment trial. You can use placeholders like `{{PICTURE1}}`, `{{PICTURE2}}`, ... `{{PICTUREN}}` to refer to the paths of your pictures (depending on how many picture columns you have in your data). Refer to the `et-experiment.js` file to see the default HTML for 1-, 2- and 3-picture layouts.
    - `response_css_selector`: The CSS selector used to get the list of response items in the custom HTML. For example, if you have custom buttons in your HTML, you can add them the `mycustombutton` CSS class and pass `.mycustombutton` as the selector in this parameter.
    - `response_keys`: The list of accepted keyboard keys, if you want to accept key press as subject input. For example: `['R', 'L']` to only accept the 'R' and 'L' keys as responses.
    - `center_gaze_after_trial`: Whether to show the yellow calibration target after each trial, to center subject gaze.
    - `single_response`. Whether the subject is allowed to only make a single response.
    - `response_ends_trial`: Whether the first response ends the trial.
    - `trial_ends_after_audio`: Whether the trial ends when the audio finishes playing, irrespective of whether there was any subject response or not.
    - `response_allowed_while_playing`: Whether the subject can make responses while the audio is still playing.
    - `pictures_delay`: Delay in ms (w.r.t. trial start) to show the pictures on the screen.
    - `audio_delay`: Delay in ms (w.r.t. trial start) to play the audio.
    
