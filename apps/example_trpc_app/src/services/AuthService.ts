import { type CognitoUser } from "@aws-amplify/auth";
import { Amplify, Auth } from "aws-amplify";
import { AuthStack } from "@/aws-exports";

Amplify.configure(AuthStack);

export class AuthService {
  private user: CognitoUser | undefined;

  public async login(
    userName: string,
    password: string
  ): Promise<object | undefined> {
    try {
      this.user = (await Auth.signIn(userName, password)) as CognitoUser;
      return this.user;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  public getUserName() {
    return this.user?.getUsername();
  }
}
