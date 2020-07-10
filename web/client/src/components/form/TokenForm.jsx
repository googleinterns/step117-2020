import React, { useState, cloneElement } from "react";
import { Formik, Form } from "formik";
import {
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  CircularProgress,
} from "@material-ui/core";
import { TokenType, TokenAccess, TokenCredentials } from "../";
import { object, string } from "yup";
import PropTypes from "prop-types";
import { getCacheToken } from "../../util/apiWrapper";

/**
 * @param {param} props passes a callback function that sends the token back to the parent
 * @return {FormikStepper} component using Formik for creating a token
 */
export default function TokenForm(props) {
  const [secondLabel, setLabel] = useState("");
  const [tokenType, setTokenType] = useState("");
  /**
   *
   * @param {string} token variable that holds the token
   */
  function sendToken(token) {
    props.parentCallback(token);
  }
  /**
   * @param {JSON} values contains the scopes/audience, type, format and credentials that the user put
   * calls apiWrapper in order to request the token from the backend
   */
  async function getToken(values) {
    const tokenCred = JSON.parse(values.tokenCredentials);
    let finalCredentials;
    if (
      tokenCred["web"] !== undefined &&
      tokenCred["installed"] === undefined
    ) {
      finalCredentials = tokenCred["web"];
    } else if (
      tokenCred["web"] === undefined &&
      tokenCred["installed"] !== undefined
    ) {
      finalCredentials = tokenCred["installed"];
    } else {
      finalCredentials = tokenCred;
    }
    let userScopes;
    let userAudience;
    if (!values.tokenScopes) {
      userAudience = values.tokenAudience;
    } else {
      userScopes = values.tokenScopes;
    }
    const Body = {
      commandtype: "fetch",
      args: {
        scope: userScopes || userAudience,
      },
      credential: finalCredentials,
      cachetoken: true,
      usetoken: false,
    };
    const Response = await getCacheToken(Body);
    if (typeof Response["error"] === undefined) {
      sendToken(Response["error"]);
    } else {
      sendToken(Response["data"]["oauth2lResponse"]);
    }
  }
  return (
    <FormikStepper
      initialValues={{
        tokenType: "",
        tokenFormat: "",
        tokenScopes: [],
        tokenAudience: [],
        tokenCredentials: "",
      }}
      onSubmit={(values) => {
        getToken(values);
      }}
      setSecondLabel={(value) => {
        setTokenType(value);
        if (value === "OAuth") {
          setLabel("Scopes");
        } else if (value === "JWT") {
          setLabel("Audience");
        }
      }}
    >
      <TokenType
        validationSchema={object({
          tokenType: string().required("Must select a token type"),
          tokenFormat: string().required("Must select a token format"),
        })}
        label="Type"
      />
      <TokenAccess
        validationSchema={object({
          ...(tokenType === "OAuth"
            ? { tokenScopes: string().required(`Must include scopes}`) }
            : tokenType === "JWT"
            ? { tokenAudience: string().required(`Must include audience}`) }
            : {}),
        })}
        label={secondLabel}
      />
      <TokenCredentials
        validationSchema={object({
          tokenCredentials: string()
            .required("Must include credential")
            .min(1, "Must include credential"),
        })}
        label="Credentials"
      />
    </FormikStepper>
  );
}

/**
 * @param {Object} props include children nodes and onSubmit function for rendering forms
 * @return {Formik} component for showing one child form at a time
 */
export function FormikStepper(props) {
  const { children } = props;
  const childrenArray = React.Children.toArray(children);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const currentChild = childrenArray[step];

  const isLastStep = () => {
    return step === childrenArray.length - 1;
  };

  return (
    <Formik
      {...props}
      validationSchema={currentChild.props.validationSchema}
      onSubmit={async (values, helpers) => {
        if (isLastStep()) {
          await props.onSubmit(values, helpers);
          setDone(true);
        } else {
          if (step === 0) {
            props.setSecondLabel(values.tokenType);
          }
          setStep((currStep) => currStep + 1);
        }
      }}
    >
      {({ isSubmitting, setFieldValue, errors, touched }) => (
        <Form>
          <Stepper alternativeLabel activeStep={step}>
            {childrenArray.map((child, index) => (
              <Step key={child.props.label} completed={step > index || done}>
                <StepLabel>{child.props.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {cloneElement(currentChild, { setFieldValue, errors, touched })}
          <Grid container spacing={2}>
            {step > 0 ? (
              <Grid item>
                <Button
                  disabled={isSubmitting}
                  color="primary"
                  variant="contained"
                  onClick={() => setStep((currStep) => currStep - 1)}
                >
                  Back
                </Button>
              </Grid>
            ) : null}
            <Grid item>
              <Button
                startIcon={
                  isSubmitting ? <CircularProgress size="1rem" /> : null
                }
                disabled={isSubmitting}
                color="primary"
                variant="contained"
                type="submit"
              >
                {isSubmitting
                  ? "Submitting"
                  : isLastStep()
                  ? "Get Token"
                  : "Next"}
              </Button>
            </Grid>
          </Grid>
        </Form>
      )}
    </Formik>
  );
}

FormikStepper.propTypes = {
  children: PropTypes.node,
  onSubmit: PropTypes.func,
  setSecondLabel: PropTypes.func,
};

TokenForm.propTypes = {
  parentCallback: PropTypes.func,
};