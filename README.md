<div align="center">

# group-to-teams-sync-bot

<img src="https://github.com/cloudpups/github-teams-user-sync/assets/4266541/f7a72671-0d41-498b-8efb-a0e63ac2b25d" alt="Billiam the Octocat helping folks get into teams." width="300" />

Groups (currently Azure Active Directory Only) to GitHub Teams sync

[![CodeQL](https://github.com/cloudpups/github-teams-user-sync/actions/workflows/codeql.yml/badge.svg)](https://github.com/cloudpups/github-teams-user-sync/actions/workflows/codeql.yml) [![Docker Pulls](https://img.shields.io/docker/pulls/trfc/github-teams-user-sync)](https://hub.docker.com/r/trfc/github-teams-user-sync) [![CodeFactor](https://www.codefactor.io/repository/github/cloudpups/github-teams-user-sync/badge)](https://www.codefactor.io/repository/github/cloudpups/github-teams-user-sync)

Before submitting a new Feature request, please check existing open and closed Issues

[![Static Badge](https://img.shields.io/badge/Open%20and%20Closed-Feature%20Requests-Gray?style=flat&labelColor=9EFFB6&color=FF9D87)
](https://github.com/cloudpups/github-teams-user-sync/issues?q=is%3Aissue+label%3Aenhancement+)

</div>

## Important Commands

```sh
# Run the application in "dev" mode and watch for changes
npm start
# Generate models from the openapi definition
npm run openapi
```

## Configuration File

This service/Action requires that a configuration file be present in the `.github` repository of your GitHub Organization. An example of this is show below:

Filename: `team-sync-options.yaml`
```yaml
# This property is used to set the Owners of the Organization. Currently, this will NOT 
# remove anyone who was manually added as an Owner to the org.
OrganizationOwnersGroup: Some_Org_Owner_Group

# This property is used to control the addition of general Members to your Organization.
OrganizationMembersGroup: Some_Group_To_Sync_For_Organization_Membership

# This property is used for syncing all other GitHub Teams. Please note that users must also 
# be a part of the `OrganizationMembersGroup` for the synchronization of the teams below to 
# function properly.
# Note: this is a convenience property. The `Teams` property allows for more complex
# setup of teams (i.e., display names and eventually parent/child relationships).
GitHubTeamNames:
- Some_Team_To_Sync
- Some_Other_Team_To_Sync

# Allows Organizations to add their own Security Manager teams in addition to those set at 
# the app level. 
# Note: this property supports Display Names.
AdditionalSecurityManagerGroups:
- Name: Some_SecurityManager_Team
- Name: Some_SecurityManager_Team_2
  DisplayName: Some Security Manager Team 2

# This property is used for syncing all other GitHub Teams. Please note that users must also 
# be a part of the `OrganizationMembersGroup` for the synchronization of the teams below to 
# function properly.
# Note: this property supports Display Names.
Teams:
- Name: Some_Team
- Name: Some_Team_2
  DisplayName: Some Team 2
```

## Necessary configuration of the tool/service

As of this writing, this sync tool can be ran as a standalone app, or as a GitHub Action.

### As a Standalone App

An Azure AD App registration must be created with the following permissions:

* **Application** Permission: `GroupMember.Read.All`
* **Application** Permission: `User.Read.All`

The Client ID and Client Secret must be provided as environment variables to the application.

A GitHub App registration must be created with the following permissions (this information should be moved to an `app.yml file` instead of being documented here):

* Repository- Contents: Read (only necessary for the `.github` repository)
* Repository- Deployments: Read and Write (only necessary for the `.github` repository)
* Organization- Members: Read and Write
* Organization- Administration: Read and Write
    * This is needed for managing [Security Managers](https://docs.github.com/en/enterprise-cloud@latest/rest/orgs/security-managers?apiVersion=2022-11-28), though as Security Managers is in beta, this permission may also change.
    * ❗ **If you do not intend to use this functionality**, feel free to exclude this permission from your GitHub App Registration

The AppId and Private Key must be provided as environment variables to the application.
