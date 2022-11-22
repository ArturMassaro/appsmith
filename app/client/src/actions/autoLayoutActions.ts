import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";

export const removeWrappers = (parentId: string) => ({
  type: ReduxActionTypes.REMOVE_CHILD_WRAPPERS,
  payload: { parentId },
});

export const addWrappers = (parentId: string) => ({
  type: ReduxActionTypes.ADD_CHILD_WRAPPERS,
  payload: {
    parentId,
  },
});

export const updateLayoutForMobileBreakpoint = (
  parentId: string,
  isMobile: boolean,
) => ({
  type: ReduxActionTypes.RECALCULATE_COLUMNS,
  payload: {
    parentId,
    isMobile,
  },
});