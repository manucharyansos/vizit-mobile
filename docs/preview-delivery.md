# Preview delivery

After a successful **Mobile CI** push run on `main`, **Publish Preview OTA** checks out that exact commit, skips it if `main` has moved, and validates the app again. Pull-request CI runs cannot publish updates. Manual dispatch remains available.

Before publication it looks for an Android `preview` build matching the current app/runtime version and channel. It reuses a finished APK or follows a queued/running build. It only queues another build when no eligible build exists. The workflow waits for a finished APK before publishing the OTA, and includes the installation link in its summary. Native dependency/configuration changes still require an app-version bump under the existing `appVersion` runtime policy and installation of that new APK. An OTA cannot replace native code in an older runtime.

**Build Preview APK** also waits for the actual build result instead of succeeding at queue submission. It checks the project, platform, profile, channel, runtime and APK artifact, downloads the APK, and attaches **vizit-preview-apk** to the workflow with an installation link. A failed or cancelled native build fails the workflow. The optional `existing_build_id` input resumes an existing build, avoiding another queue entry. Long queues can be resumed with that ID after the workflow timeout.

Both workflows share a build concurrency group so they do not queue parallel native builds for the same update. Automatic OTA publication links the existing APK without uploading another large GitHub artifact on every JavaScript change. Manual APK artifacts are retained for 14 days. Existing `EXPO_TOKEN`, signing credentials and the EAS project remain in use.

No store submission, hosting-plan purchase, native dependency change or app-data reset is performed by these workflows. iOS OTA still requires an installed compatible iOS binary; this workflow prepares the Android preview APK.
