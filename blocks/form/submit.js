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

export function submitFailure(e, form) {
  let errorMessage = form.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = 'Some error occured while submitting the form'; // TODO: translation
  form.prepend(errorMessage);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function getFieldValue(fe, payload) {
  if (fe.type === 'radio') {
    return fe.form.elements[fe.name].value;
  } if (fe.type === 'checkbox') {
    if (payload[fe.name]) {
      if (fe.checked) {
        return `${payload[fe.name]},${fe.value}`;
      }
      return payload[fe.name];
    } if (fe.checked) {
      return fe.value;
    }
  } else if (fe.type !== 'file') {
    return fe.value;
  }
  return null;
}

function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((fe) => {
    if (fe.name && !fe.matches('button') && !fe.disabled && fe.tagName !== 'FIELDSET') {
      const value = getFieldValue(fe, payload);
      if (fe.closest('.repeat-wrapper')) {
        payload[fe.name] = payload[fe.name] ? `${payload[fe.name]},${fe.value}` : value;
      } else {
        payload[fe.name] = value;
      }
    }
  });
  return { payload };
}

async function prepareRequest(form) {
  const { payload } = constructPayload(form);
  const headers = {
    'Content-Type': 'application/json',
    // eslint-disable-next-line comma-dangle
    'x-adobe-form-hostname': window?.location?.hostname
  };
  const body = { data: payload };
  let url;
  let baseUrl = getSubmitBaseUrl();
  if (!baseUrl) {
    // eslint-disable-next-line prefer-template
    baseUrl = 'https://forms.adobe.com/adobe/forms/af/submit/';
    url = baseUrl + btoa(`${form.dataset.action}.json`);
  } else {
    url = form.dataset.action;
  }
  return { headers, body, url };
}

async function submitDocBasedForm(form, captcha) {
  try {
    const { headers, body, url } = await prepareRequest(form, captcha);
    let token = null;
    if (captcha) {
      token = await captcha.getToken();
      body.data['g-recaptcha-response'] = token;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      submitSuccess(response, form);
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}
async function handleSubmit(e, formUrl) {
  e.preventDefault();
  
  // 1. Gather all form inputs into a JSON payload
  const formData = new FormData(e.target);
  const payload = Object.fromEntries(formData.entries());

  // 2. Dynamically look for the URL you saved in DA.live's config sheet
  const targetEndpoint = window.siteConfig?.['forms-submit-url'] || 'https://yourdomain.com';

  // 3. Post the data payload directly to your REST endpoint
  const response = await fetch(targetEndpoint, {
    method: window.siteConfig?.['forms-submit-method'] || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    alert('Form submitted successfully via REST!');
  } else {
    console.error('Submission failed');
  }
}

