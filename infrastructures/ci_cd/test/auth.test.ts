import { AuthService } from "./AuthService.test";

async function testAuth() {
  const service = new AuthService();
  const loginResult = await service.login("xxxx", "xxxx)");
  console.log(loginResult);
}

void testAuth();
