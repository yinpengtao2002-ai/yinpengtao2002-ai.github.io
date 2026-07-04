export const SITE_MOBILE_BREAKPOINT_PX = 768;
export const SITE_MOBILE_QUERY = `(max-width: ${SITE_MOBILE_BREAKPOINT_PX}px)`;
export const TOUCH_POINTER_QUERY = "(pointer: coarse), (hover: none)";
export const TOUCH_OR_MOBILE_QUERY = `${TOUCH_POINTER_QUERY}, ${SITE_MOBILE_QUERY}`;

export const STUDY_CARDS_MOBILE_PRACTICE_QUERY = "(max-width: 760px) and (orientation: portrait)";
export const STUDY_CARDS_RESULT_PORTRAIT_QUERY = "(max-width: 900px) and (orientation: portrait)";
