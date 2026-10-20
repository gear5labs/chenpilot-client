## Summary
Describe the user-facing or architectural change and link the related issue (`Closes #<issue>`).

## Wallet Safety & Migration Impact Checklist
- [ ] **Transaction Safety**: Recipient address, asset code/issuer, amount precision (7 decimals), and memo rules are validated before submission.
- [ ] **Data Persistence & Privacy**: No secret keys, raw bearer tokens, or unredacted prompts are logged; offline/localStorage state is versioned.
- [ ] **API Contract Compatibility**: Request/response shapes match `docs/API_CONTRACT.md` without breaking existing consumers.
- [ ] **Accessibility (a11y)**: Interactive controls have explicit labels, keyboard navigation, and screen-reader status announcements.
- [ ] **Automated Tests**: Focused unit/component tests added or updated for the modified behavior.
