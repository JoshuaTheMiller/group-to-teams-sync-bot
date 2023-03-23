import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { Config } from "../config";
import { OrgConfiguration } from "../OrgConfiguration";
import yaml from "js-yaml";

function authenticatedClient() {
    const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: Config().GitHub.AppId,
            privateKey: Config().GitHub.PrivateKey,
        }
    })

    return appOctokit;
}

async function GetInstallations(client: Octokit): Promise<Org[]> {    
    const installationList = await client.paginate(client.rest.apps.listInstallations, {
        per_page: 100
    })

    const mappedOrgs = installationList.map(i => {
        return {
            id: i.id,
            orgName: i.account?.login ?? ""
        }
    });

    return mappedOrgs;
}

async function GetOrgClient(installationId: number): Promise<InstalledClient> {
    // TODO: look further into this... it seems like it would be best if 
    // installation client was generated from the original client, and not
    // created fresh.
    const installedOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: Config().GitHub.AppId,
            privateKey: Config().GitHub.PrivateKey,
            installationId
        }
    })

    const orgName = await installedOctokit.rest.apps.getInstallation({ installation_id: installationId });

    return new InstalledGitHubClient(installedOctokit, orgName.data.account?.login!);
}

export interface Org {
    id: number,
    orgName: string
}

export interface GitHubClient {
    GetInstallations(): Promise<Org[]>
    GetOrgClient(installationId: number): Promise<InstalledClient>
}

export interface InstalledClient {
    GetCurrentOrgName(): string
    GetCurrentRateLimit(): Promise<{ remaining: number }>
    AddOrgMember(id: GitHubId): Response
    IsUserMember(id: GitHubId): Response<boolean>
    GetAllTeams(): Response<GitHubTeamId[]>
    AddTeamMember(team: GitHubTeamName, id: GitHubId): Response
    CreateTeam(teamName: GitHubTeamName): Response
    DoesUserExist(gitHubId: string): Response<GitHubId>
    ListCurrentMembersOfGitHubTeam(team: GitHubTeamName): Response<GitHubId[]>
    RemoveTeamMemberAsync(team: GitHubTeamName, user: GitHubUser): Response
    UpdateTeamDetails(team: GitHubTeamName, description: string): Response
    AddSecurityManagerTeam(team: GitHubTeamName): Promise<any>
    GetConfigurationForInstallation(): Response<OrgConfiguration>
}

export function GetClient(): GitHubClient {
    const client = authenticatedClient();
    return {
        GetInstallations: () => GetInstallations(client),
        GetOrgClient: (installationId: number) => GetOrgClient(installationId)
    }
}

export type GenericSucceededResponse<T> = {
    successful: true,
    data: T
}

export type FailedResponse = {
    successful: false
}

export type Response<T = any> = Promise<GenericSucceededResponse<T> | FailedResponse>;

export type GitHubId = string;

export type GitHubUser = {
    Name: string,
    Email: string
}

export type GitHubTeamId = {
    Id: number,
    Name: string    
}

export type GitHubTeam = {
    Id: number,
    Name: string,
    Members: GitHubUser[]
}

export type GitHubTeamName = string;

class InstalledGitHubClient implements InstalledClient {
    gitHubClient: Octokit;
    orgName: string;

    constructor(gitHubClient: Octokit, orgName: string) {
        this.gitHubClient = gitHubClient;
        this.orgName = orgName;
    }

    public GetCurrentOrgName(): string {
        return this.orgName;
    }

    public async GetCurrentRateLimit(): Promise<{ remaining: number; }> {
        const limits = await this.gitHubClient.rest.rateLimit.get();

        return {
            remaining: limits.data.rate.remaining
        }
    }

    public async AddOrgMember(id: string): Response<boolean> {
        const response = await this.gitHubClient.rest.orgs.setMembershipForUser({
            org: this.orgName,
            username: id
        })

        if (response.status != 200) {
            return {
                successful: false
            }
        }

        return {
            successful: false
        }
    }

    public async IsUserMember(id: string): Response<boolean> {        
        try {
            const response = await this.gitHubClient.rest.orgs.checkMembershipForUser({
                org: this.orgName,
                username: id
            })
    
            console.log(response)
        }
        catch{
            // TODO: actually catch exception and investigate...
            // not all exceptions could mean that the user is not a member
            return {
                successful: true,
                data: false
            }
        }
        
        return {
            successful: true,
            data: true            
        }
    }

    public async GetAllTeams(): Response<GitHubTeamId[]> {
        const response = await this.gitHubClient.paginate(this.gitHubClient.rest.teams.list, {
            org: this.orgName
        })

        const teams = response.map(i => {
            return {
                Id: i.id,
                Name: i.name                             
            }
        });

        return {
            successful: true,
            data: teams
        }
    }

    public async AddTeamMember(team: GitHubTeamName, id: GitHubId): Response<any> {
        await this.gitHubClient.rest.teams.addOrUpdateMembershipForUserInOrg({
            org: this.orgName,
            team_slug: team,
            username: id
        })

        return {
            successful: true,
            // TODO: make this type better to avoid nulls...
            data: null
        }
    }

    public async CreateTeam(team: GitHubTeamName): Response<any> {
        await this.gitHubClient.rest.teams.create({
            name: team,
            org: this.orgName
        })

        return {
            successful: true,
            // TODO: make this type better to avoid nulls...
            data: null
        }
    }

    public async DoesUserExist(gitHubId: string): Response<GitHubId> {
        try {
            const response = await this.gitHubClient.rest.users.getByUsername({
                username: gitHubId
            })

            return {
                successful:true,
                data: response.data.login
            }
        }
        catch {
            return {
                successful: false
            }
        }
    }

    public async ListCurrentMembersOfGitHubTeam(team: GitHubTeamName): Response<GitHubId[]> {
        const response = await this.gitHubClient.paginate(this.gitHubClient.rest.teams.listMembersInOrg, {
            org: this.orgName,
            team_slug: team,            
        })

        return {
            successful: true,
            data: response.map(i => {
                return i.login
            })
        }
    }

    public async RemoveTeamMemberAsync(team: GitHubTeamName, user: GitHubUser): Response<any> {
        await this.gitHubClient.rest.teams.removeMembershipForUserInOrg({
            team_slug: team,
            org: this.orgName,
            username: user.Name
        })

        return {
            successful: true,
            // TODO: make this type better to avoid nulls...
            data: null
        }
    }

    public async UpdateTeamDetails(team: GitHubTeamName, description: string): Response<any> {
        await this.gitHubClient.rest.teams.updateInOrg({
            org: this.orgName,
            privacy: "closed",
            team_slug: team,
            description: description
        })

        return {
            successful: true,
            // TODO: make this type better to avoid nulls...
            data: null
        }
    }

    public async AddSecurityManagerTeam(team: GitHubTeamName) {
        await this.gitHubClient.rest.orgs.addSecurityManagerTeam({
            org: this.orgName,
            team_slug: team
        })
    }

    public async GetConfigurationForInstallation(): Response<OrgConfiguration> {
        const getContentRequest = {
            owner: this.orgName,
            repo: ".github",
            path: ""
        };

        const filesResponse = await this.gitHubClient.rest.repos.getContent(getContentRequest);

        let potentialFiles = filesResponse.data;

        if (!Array.isArray(potentialFiles)) {
            return {
                successful: false
            }
        }

        const onlyConfigFiles = potentialFiles
            .filter(i => i.type == "file")
            .filter(i => i.name == "team-sync-options.yml" || i.name == "team-sync-options.yaml");

        if (onlyConfigFiles.length != 1) {
            return {
                successful: false
            }
        }

        const onlyFile = onlyConfigFiles[0];

        const contentResponse = await this.gitHubClient.rest.repos.getContent({
            ...getContentRequest,
            path: onlyFile.name
        })

        const contentData = contentResponse.data;

        if (Array.isArray(contentData) || contentData.type != "file") {
            return {
                successful: false
            }
        }

        const configuration = yaml.load(Buffer.from(contentData.content, 'base64').toString()) as OrgConfiguration;

        return {
            successful: true,
            data: configuration
        }
    }
}