import { DEFAULT_THANK_YOU_MESSAGE, getSubmitBaseUrl } from './constant.js';

export function submitSuccess(e, form) {
  const { payload } = e;
  const redirectUrl = form.dataset.redirectUrl || payload?.body?.redirectUrl;
  const thankYouMsg = form.dataset.thankYouMsg || payload?.body?.thankYouMessage;
  if (redirectUrl) {
    window.location.assign(encodeURI(redirectUrl));
  } else {
    let thankYouMessage = form.parentNode.querySelector('.form-message.success-message');
    if (!thankYouMessage) {
      thankYouMessage = document.createElement('div');
      thankYouMessage.className = 'form-message success-message';
    }
    thankYouMessage.innerHTML = thankYouMsg || DEFAULT_THANK_YOU_MESSAGE;
    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: 'smooth' });
    }
    form.reset();
  }
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form, customMessage) {
  let errorMessage = form.parentNode.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = customMessage || 'Some error occured while submitting the form'; // TODO: translation
  form.parentNode.insertBefore(errorMessage, form);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

// Path to the standalone config document in da.live (NOT the registration sheet).
const CONFIG_DOC_PATH = '/events/config';

// Cache config so we don't refetch on every submit attempt
let configPromise = null;

async function getFormConfig() {
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const configUrl = `${CONFIG_DOC_PATH}.json?sheet=config`;
    const res = await fetch(configUrl);
    if (!res.ok) {
      throw new Error(`Could not load form config (${res.status})`);
    }
    const json = await res.json();
    const rows = json.data || [];

    return rows.reduce((acc, row) => {
      const key = row.key ?? row.Key;
      const value = row.value ?? row.Value;
      if (key) acc[key] = value;
      return acc;
    }, {});
  })();

  return configPromise;
}

async function submitToRestEndpoint(form) {
  const config = await getFormConfig();

  const endpoint = config['submit-endpoint'];
  const method = config['submit-method'] || 'POST';
  const successMessage = config['success-message'];

  if (!endpoint) {
    throw new Error('No submit-endpoint configured in the form config sheet');
  }

  const formData = new FormData(form);
  const jsonPayload = Object.fromEntries(formData.entries());

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(jsonPayload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  return { successMessage };
}

export async function handleSubmit(e, form) {
  e.preventDefault();
  const formElement = e.target;
  if (!formElement.checkValidity()) {
    formElement.reportValidity();
    return;
  }

  formElement.setAttribute('data-submitting', 'true');
  const submitButton = formElement.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const { successMessage } = await submitToRestEndpoint(formElement);
    submitSuccess({ payload: { body: { thankYouMessage: successMessage } } }, formElement);
  } catch (error) {
    console.error('Form submission failed:', error);
    submitFailure(error, formElement);
  }
}
