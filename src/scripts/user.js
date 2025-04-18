import axios from 'axios'
import { deleteNotificationToken } from '@/scripts/firebase-notifications.js'
import {useUserGroupsStore} from '@/stores/userGroupsStore.js'

function getToken() {
  return sessionStorage.getItem('authToken')
}

function isUserLoggedIn() {
  return getToken() !== null
}

function isTestUser() {
  return getLoggedInUser().name === 'Test'
}

async function logout() {
  const userId = getLoggedInUser().id
  useUserGroupsStore().cleanAllGroups()
  try {
    await deleteNotificationToken(userId)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      if (registration) {
        await registration.unregister()
      }
    }
  } catch (error) {
    console.error('Error during logout:', error)
  }
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('userData')
}

function getLoggedInUser() {
  return JSON.parse(sessionStorage.getItem('userData'))
}

async function getUserByEmail(email) {
    const response = await axios.post(`api/users/getuser`, { "email": email });
    return response.data.data;
}

async function getUserById(id) {
  const response = await axios.get(`api/users/${id}`);
  return response.data.data;
}

async function authenticate(token) {
  try {
    const response = await axios.post(`api/auth/authorize`, { "token": token });
    return response.data.data.authorized;
  } catch (error) {
    throw new Error(
      `Error authenticating user: ${error.response ? error.response.statusText : error.message}`
    );
  }
}

async function login(email, password) {
  const response = await axios.post(`api/auth/login`, { "email": email, "password": password });
  if (response.data.data.token) {
    sessionStorage.setItem('authToken', response.data.data.token)
    sessionStorage.setItem('userData', JSON.stringify(await getUserByEmail(email)));
    return true;
  }
  return false;
}

async function registerAndLogin(name, surname, email, password) {
  const response = await axios.post("api/users", {
    userData: {
      name: name,
      surname: surname,
      email: email,
    },
    password: password,
  })
  if (response.data.code === 200) {
    sessionStorage.setItem("userData", JSON.stringify(response.data.data))
    return await login(email, password)
  }
}

async function updateUser(userData) {
  const userId = getLoggedInUser().id;
  const response = await axios.put(`api/users/${userId}`, {
    user: { userData, password: null },
  });
  if (response.data.code === 200) {
    sessionStorage.setItem('userData', JSON.stringify(await getUserById(userId)));
    return true;
  }
  return false;
}

async function updatePassword(password) {
  const userId = getLoggedInUser().id;
  const response = await axios.put(`api/users/${userId}`, {
    user: { password: password },
  });
  return response.data.code === 200;
}

export {
  getUserByEmail,
  getToken,
  authenticate,
  login,
  registerAndLogin,
  isUserLoggedIn,
  logout,
  getLoggedInUser,
  updateUser,
  updatePassword,
  isTestUser,
};
