import AuthForm from "../AuthForm";
import { signIn } from "../actions";

export default function LoginPage() {
  return <AuthForm mode="signin" action={signIn} />;
}
