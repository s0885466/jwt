/**
 * Наши фанки
 **/

/** Наша функция apiCall **/
const postHost = (token, host) =>
  postJson("http://localhost:8080/api/hosts", token, host);

/** фанк для запроса добавления хоста **/
export function createHost(host) {
  return function (dispatch, getState) {
    return apiWithToken(postHost, host, {dispatch, getState})
      .then(res => res.json())
      .then(host => dispatch(addHost(host)))
      .catch(err => console.log(err));
  };
}

/**
 * Наши api helpers
 **/

/** Возвращает из редукс стора аксесс токен или undefined **/
function tokenSelector(state) {
    return (state.tokens || {}).accessToken;
}

/** Добавляет заголовок с токеном **/
function addBearer(token) {
    return { Authorization: `Bearer ${token}` };
}

/** Делает запрос на сервер с токеном **/
export function postJson(url, token, data) {
    return fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            ...addBearer(token)
        }
    });
}

/** В случае если токен устарел - обновляет его **/
function refreshTokens({ getState, dispatch }) {
    return getJson(
      "http://localhost:8080/api/refresh",
      getState().tokens.refreshToken
    )
      .then(res => {
          if (res.status === 200) {
              return res.json();
          }
          throw new Error();
      })
      .then(
        tokens => {
            dispatch(saveTokens(tokens));
        },
        err => {
            dispatch(deleteTokens());
        }
      );
}

/** Самая главная функция apiWithToken **/
export function apiWithToken(apiCall, data = {}, {dispatch, getState}) {
  return apiCall(tokenSelector(getState()), data)
    .then(res => {
        /** Если ответ сервера 401 - не авторизирован то заного запрашиваем токен и вызываем снова  apiCall (рекурсионно) **/
      if (res.status === 401) {
        return refreshTokens({dispatch, getState}).then(() =>
          apiCall(tokenSelector(getState()), data)
        );
      }
        /** Если все норм то возвращаем промис с результатом **/
      return res;
    })
    .then(res => {
      switch (res.status) {
        case 200: {
          return res.json();
        }
        case 201: {
          return res;
        }
        case 204: {
          return null;
        }
        default: {
          return res.json().then(err => {
            throw err;
          });
        }
      }
    });
}

/**
 * Получение токена и сохранение токена
 **/

const getTokens = credentials => {
    return fetch("http://localhost:8080/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
    });
};

const saveTokens = tokens => dispatch => {
    dispatch(setTokens(tokens));
    window.sessionStorage.setItem('tokens', JSON.stringify(tokens));
}

const signIn = credentials => dispatch => {
    return getTokens(credentials).then(resp => {
        switch (resp.status) {
            case 200: {
                return resp.json().then(tokens => {
                    dispatch(saveTokens(tokens));
                });
            }

            case 400: {
                return resp.json().then(err => {
                    throw err;
                });
            }
        }
    });
};




