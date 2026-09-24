# Merge Protocol

This repository uses a protected three-branch promotion flow. A change must move through the
branches in order; branches must not be skipped.

```text
feature/*, fix/*, chore/*  ->  development  ->  staging  ->  master
                                  |              |             |
                              verify         sandbox       production
```

## Branch roles

| Branch        | Purpose                                                  | Permitted pull-request source | Post-merge effect                                                              |
| ------------- | -------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `development` | Integration of normal feature, fix, and maintenance work | A focused topic branch        | Quality checks only                                                            |
| `staging`     | Integrated release candidate                             | `development` only            | Automatic deployment to the disposable staging Apps Script project             |
| `master`      | Production release history                               | `staging` only                | Automatic production Apps Script release after the protected environment gates |

All three branches are protected. Direct pushes, force-pushes, and branch deletion are not part of
the normal workflow.

## Standard procedure

1. Create a short-lived topic branch from the current `development` tip.
2. Open a pull request from the topic branch into `development`. Keep the change focused, include
   tests and documentation, and wait for the `verify` check to pass.
3. Merge into `development` only after review and a green `verify` check. Keep `development` green.
4. When a coherent release candidate is ready, open a pull request from `development` into
   `staging`. Do not use a topic branch as the source for this promotion.
5. Merge into `staging` after `verify` passes. The staging workflow deploys the resulting commit to
   the disposable workbook. Run the staging setup, connection, account, balance, and transaction
   checks and retain the deployment evidence.
6. After the staging checks and acceptance evidence are complete, open a pull request from
   `staging` into `master`. This is the only permitted production promotion.
7. Merge into `master` only after the required checks pass and the production release decision has
   been made. The production workflow then deploys the exact merged `master` commit.

## Pull-request rules

- Every PR must state its source branch, target branch, purpose, validation commands, and any
  operational or migration impact.
- A PR targeting `staging` is valid only when its source is the repository's `development` branch.
- A PR targeting `master` is valid only when its source is the repository's `staging` branch.
- Do not merge a PR with a failing or stale `verify` check. Update the branch and rerun validation.
- Resolve review conversations and update the PR description when the release scope changes.
- Do not include credentials, account identifiers, bank exports, or unsanitized provider payloads.

## Recovery and exceptions

If a staging or production deployment fails, stop promotion, preserve the workflow evidence and
affected workbook, and follow [Deployment and Release Operations](deployment.md). Fix the issue in a
new topic branch and move it through the same sequence. Emergency changes still require a PR; an
emergency is not permission to bypass branch protection or promote an untested branch.

The workflow files are the executable source of truth for checks and deployment triggers. This
document is the human operating protocol and must be updated whenever branch rules or release
automation changes.
