import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";
import { toggleAuthPopup } from "./popupSlice";
import {
  setAuthToken,
  clearAuthToken,
} from "../../lib/authCookie";

function omitSensitiveUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.password;
  delete safe.reset_password_token;
  delete safe.reset_password_expires;
  return safe;
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message ?? fallback;
}

export const register = createAsyncThunk(
  "auth/register",
  async (data, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/auth/register", data);
      toast.success(
        response.data.message ?? "Account created successfully",
      );
      thunkAPI.dispatch(toggleAuthPopup());
      return omitSensitiveUser(response.data.user);
    } catch (error) {
      const message = getErrorMessage(error, "Registration failed");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const login = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/login", data);
    const token = response.data.token;
    if (token) {
      setAuthToken(token);
    }
    toast.success(response.data.message);
    thunkAPI.dispatch(toggleAuthPopup());
    return omitSensitiveUser(response.data.user);
  } catch (error) {
    const message = getErrorMessage(error, "Login failed");
    toast.error(message);
    return thunkAPI.rejectWithValue(message);
  }
});

export const getUser = createAsyncThunk(
  "auth/getUser",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/auth/me");
      return omitSensitiveUser(response.data.user);
    } catch (error) {
      const unauthorized = error.response?.status === 401;
      if (unauthorized) {
        clearAuthToken();
      }
      return thunkAPI.rejectWithValue({
        message: getErrorMessage(error, "Failed to get user"),
        unauthorized,
      });
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  clearAuthToken();
  return null;
});

/** POST /auth/password/forgot — body `{ email }`, optional `frontendUrl` query for reset link origin */
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (arg, thunkAPI) => {
    try {
      const { email, frontendUrl } =
        typeof arg === "string" ? { email: arg, frontendUrl: undefined } : arg;
      const params = {};
      if (frontendUrl) {
        params.frontendUrl = frontendUrl;
      }
      const response = await axiosInstance.post(
        "/auth/password/forgot",
        { email },
        { params },
      );
      toast.success(response.data.message);
      return response.data.message;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to send reset email");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

/** PUT /auth/password/reset — body `{ token, password, confirmPassword }` */
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password, confirmPassword }, thunkAPI) => {
    try {
      const response = await axiosInstance.put("/auth/password/reset", {
        token,
        password,
        confirmPassword,
      });
      toast.success(response.data.message);
      return response.data.message;
    } catch (error) {
      const message = getErrorMessage(error, "Password reset failed");
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

/** PUT /auth/password/update — authenticated */
export const updatePassword = createAsyncThunk(
  "auth/updatePassword",
  async (
    { currentPassword, newPassword, confirmNewPassword },
    thunkAPI,
  ) => {
    try {
      const response = await axiosInstance.put("/auth/password/update", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success(response.data.message);
      return response.data.message;
    } catch (error) {
      const unauthorized = error.response?.status === 401;
      if (unauthorized) {
        clearAuthToken();
      }
      const message = getErrorMessage(error, "Failed to update password");
      toast.error(message);
      return thunkAPI.rejectWithValue({ message, unauthorized });
    }
  },
);

/** PUT /auth/profile/update — multipart `name`, `email`, optional `avatar` file */
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async ({ name, email, avatar }, thunkAPI) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      if (avatar) {
        formData.append("avatar", avatar);
      }
      const response = await axiosInstance.put(
        "/auth/profile/update",
        formData,
      );
      toast.success(response.data.message);
      return omitSensitiveUser(response.data.user);
    } catch (error) {
      const unauthorized = error.response?.status === 401;
      if (unauthorized) {
        clearAuthToken();
      }
      const message = getErrorMessage(error, "Failed to update profile");
      toast.error(message);
      return thunkAPI.rejectWithValue({ message, unauthorized });
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isCheckingAuth: true,
    isRequestingForToken: false,
    isResettingPassword: false,
    isUpdatingPassword: false,
    isUpdatingProfile: false,
  },
  reducers: {
    setAuthChecking(state, action) {
      state.isCheckingAuth = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isSigningUp = true;
      })
      .addCase(register.fulfilled, (state) => {
        state.isSigningUp = false;
      })
      .addCase(register.rejected, (state) => {
        state.isSigningUp = false;
      })
      .addCase(login.pending, (state) => {
        state.isLoggingIn = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoggingIn = false;
        state.authUser = action.payload;
      })
      .addCase(login.rejected, (state) => {
        state.isLoggingIn = false;
      })
      .addCase(getUser.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.authUser = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.isCheckingAuth = false;
        if (action.payload?.unauthorized) {
          state.authUser = null;
        }
      })
      .addCase(logout.fulfilled, (state) => {
        state.authUser = null;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isRequestingForToken = true;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isRequestingForToken = false;
      })
      .addCase(forgotPassword.rejected, (state) => {
        state.isRequestingForToken = false;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isResettingPassword = true;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isResettingPassword = false;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.isResettingPassword = false;
      })
      .addCase(updatePassword.pending, (state) => {
        state.isUpdatingPassword = true;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.isUpdatingPassword = false;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.isUpdatingPassword = false;
        if (action.payload?.unauthorized) {
          state.authUser = null;
        }
      })
      .addCase(updateProfile.pending, (state) => {
        state.isUpdatingProfile = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.authUser = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdatingProfile = false;
        if (action.payload?.unauthorized) {
          state.authUser = null;
        }
      });
  },
});

export const { setAuthChecking } = authSlice.actions;
export default authSlice.reducer;
