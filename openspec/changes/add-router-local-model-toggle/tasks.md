## 1. Configuration and State

- [ ] 1.1 Add router local-mode types, local/remote router model profiles, and active-model resolution helpers in `config.ts`.
- [ ] 1.2 Update router status formatting to include `local:on` or `local:off` and the active router model.
- [ ] 1.3 Extend router state persistence to save and restore local mode while remaining compatible with existing state files.
- [ ] 1.4 Add or update config/state tests for defaults, active model resolution, status output, and old persisted state compatibility.

## 2. Local llama.cpp Lifecycle

- [ ] 2.1 Add a local lifecycle helper that checks the local `/v1/models` endpoint for the configured profile.
- [ ] 2.2 Add lifecycle helper support for starting `~/.local/bin/llama-gemma4-server` detached when the endpoint is down.
- [ ] 2.3 Add lifecycle helper support for stopping the process bound to the configured local router model port.
- [ ] 2.4 Add lifecycle helper tests for already-running, start-needed, start-failure, stop-success, and stop-failure behavior using injected command/fetch dependencies.

## 3. Router Command Behavior

- [ ] 3.1 Update `installPiRouter` dependencies to allow tests to inject local lifecycle behavior.
- [ ] 3.2 Implement `/router local on` to persist local mode, switch the active router model to local, health-check the endpoint, and start llama.cpp if needed.
- [ ] 3.3 Implement `/router local off` to persist remote mode, switch the active router model to GPT-5.4 Nano, and stop the local llama.cpp server.
- [ ] 3.4 Implement `/router local` and unknown local subcommand usage feedback without changing router state.
- [ ] 3.5 Ensure `/router on` and `/router off` preserve local mode and only change router enabled state.
- [ ] 3.6 Add extension command tests for local on/off, status output, usage feedback, and preservation of local mode through router on/off commands.

## 4. Routing Integration and Verification

- [ ] 4.1 Update prompt routing to pass the active router model resolved from local mode.
- [ ] 4.2 Update final-answer translation to pass the active router model resolved from local mode.
- [ ] 4.3 Add tests proving prompt routing and final-answer translation use the selected local or remote profile.
- [ ] 4.4 Run the pi-router test suite with `cd .pi/agent/extensions/pi-router && npm test`.
- [ ] 4.5 Run OpenSpec validation/status checks for `add-router-local-model-toggle` and confirm all artifacts are complete.
