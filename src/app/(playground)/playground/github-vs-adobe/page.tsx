import { redirect } from "next/navigation";

/** @deprecated Use /playground/design-systems — compares every installed DS. */
export default function GithubVsAdobeRedirect() {
  redirect("/playground/design-systems");
}
