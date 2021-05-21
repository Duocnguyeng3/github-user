import React, { useState, useEffect, createContext } from "react";
import mockUser from "./mockData.js/mockUser";
import mockRepos from "./mockData.js/mockRepos";
import mockFollowers from "./mockData.js/mockFollowers";
import axios from "axios";

const rootUrl = "https://api.github.com";

const GithubContext = createContext();

const GithubProvider = ({ children }) => {
  const [githubUser, setGithubUser] = useState(mockUser);
  const [repos, setRepos] = useState(mockRepos);
  const [followers, setFollowers] = useState(mockFollowers);

  // request loading
  const [requests, setRequests] = useState({
    totalRequests: 0,
    requestsRemain: 0,
    minutesRemain: 0,
    secondRemain: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ show: false, msg: "" });

  const searchGithubUser = async (user) => {
    toggleError();
    setLoading(true);
    const response = await axios(`${rootUrl}/users/${user}`).catch((err) =>
      console.log(err)
    );
    if (response) {
      setGithubUser(response.data);
      const { login, followers_url } = response.data;
      await Promise.allSettled([
        axios(`${rootUrl}/users/${login}/repos?per_page=100`),
        axios(`${rootUrl}/users/${login}/followers?per_page=100`),
      ]).then((results) => {
        const [repos, followers] = results;
        const status = "fulfilled";
        console.log(repos, followers);
        if (repos.status === status) {
          setRepos(repos.value.data);
        }
        if (followers.status === status) {
          setFollowers(followers.value.data);
        }
      });
    } else {
      toggleError(true, "there is no user with that username");
    }
    checkRequest();
    setLoading(false);
  };

  const checkRequest = () => {
    axios(`${rootUrl}/rate_limit`)
      .then(({ data }) => {
        const totalRequests = data.rate.limit;
        const requestsRemain = data.rate.remaining;
        const timeRemain = data.rate.reset;
        const now = Date.now();
        const minutesRemain = (
          "" + Math.floor((timeRemain - now / 1000) / 60)
        ).padStart(2, "0");
        const secondRemain = (
          "" + Math.floor((timeRemain - now / 1000) % 60)
        ).padStart(2, "0");

        if (requestsRemain === 0) {
          toggleError(true, "sorry, you have exceeded your hourly rate limit");
        }
        setRequests({
          totalRequests,
          requestsRemain,
          minutesRemain,
          secondRemain,
        });
      })
      .catch((err) => console.error(err));
  };

  function toggleError(show = false, msg = "") {
    setError({ show, msg });
  }

  useEffect(checkRequest, []);
  return (
    <GithubContext.Provider
      value={{
        githubUser,
        repos,
        followers,
        requests,
        error,
        searchGithubUser,
        loading,
      }}
    >
      {children}
    </GithubContext.Provider>
  );
};
export { GithubContext, GithubProvider };
