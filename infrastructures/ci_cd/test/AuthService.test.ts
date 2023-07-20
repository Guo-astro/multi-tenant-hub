import { type CognitoUser } from "@aws-amplify/auth";
import { Amplify, Auth } from "aws-amplify";

const awsRegion = "ap-northeast-1";

Amplify.configure({
  Auth: {
    region: awsRegion,
    userPoolId: "ap-northeast-1_z1u4zd8nP",
    userPoolWebClientId: "66cf9ledv23ikp3nf9nvcvbtn",
    authenticationFlowType: "USER_PASSWORD_AUTH",
  },
});



export class AuthService {
  public async login(userName: string, password: string) {
    const result = (await Auth.signIn(userName, password)) as CognitoUser;
    return result;
  }
}
