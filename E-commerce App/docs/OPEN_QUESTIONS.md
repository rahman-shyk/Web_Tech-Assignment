# Open Questions

## Q-001: Durable job queue

Choose Redis/BullMQ, MongoDB-backed queues, or a hosted provider before asynchronous production workloads begin.

## Q-002: Initial subscription plans and prices

The MVP has a configurable Starter feature set and plan catalog, but prices,
billing intervals, and payment collection were not provided in the SRS.

## Q-003: Preview database

Provide a valid, isolated MongoDB replica-set URI for local integration testing
and Netlify Preview. The currently configured local URI is still a placeholder;
do not use production data for this validation.

## Q-004: Payment and shipping providers

Use mock adapters until a real provider is selected.

## Q-005: Netlify authentication

Sign in to Netlify in the integrated browser before a preview site can be
created or linked. No deploy has been published.
