import { toast } from "react-toastify";
import Constants from "../constants";

const DEMO_CREDENTIALS = {
  user: { email: "rajesh.kumar@dailydose.demo", password: "Demo@1234" },
  caretaker: { email: "ananya.reddy@dailydose.demo", password: "Demo@1234" },
};

export const quickDemoLogin = async (role, navigate) => {
  const { email, password } = DEMO_CREDENTIALS[role];
  try {
    const response = await fetch(Constants.BASE_URL + "/api/user/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const result = await response.json();
    if (result.status === "success") {
      toast.success("Viewing demo as " + role);
      localStorage.setItem("user-info", JSON.stringify(result));
      localStorage.setItem("token", result.token);
      localStorage.setItem("role", role);
      setTimeout(() => {
        navigate(role === "user" ? "/user-dash" : "/care-dashboard", { replace: true });
      }, 1000);
    } else {
      toast.error("Demo account unavailable. Please try again later.");
    }
  } catch (error) {
    console.log("error", error);
    toast.error("Unable to reach the server. Please try again later.");
  }
};
