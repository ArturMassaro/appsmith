import {
  DataTree,
  DataTreeAction,
  DataTreeJSAction,
  DataTreeWidget,
  ENTITY_TYPE,
} from "entities/DataTree/dataTreeFactory";
import { createSelector } from "reselect";
import {
  getActionsForCurrentPage,
  getJSCollectionsForCurrentPage,
  getPlugins,
} from "selectors/entitiesSelector";
import { getWidgets } from "sagas/selectors";
import { getCurrentPageId } from "selectors/editorSelectors";
import { getActionConfig } from "pages/Editor/Explorer/Actions/helpers";
import { builderURL, jsCollectionIdURL } from "RouteBuilder";
import { isFunction, keyBy } from "lodash";
import { getDataTree } from "selectors/dataTreeSelectors";
import { JSCollectionData } from "reducers/entityReducers/jsActionsReducer";
import { FlattenedWidgetProps } from "reducers/entityReducers/canvasWidgetsReducer";
import {
  entityDefinitions,
  EntityDefinitionsOptions,
} from "@appsmith/utils/autocomplete/EntityDefinitions";
import { ActionData } from "reducers/entityReducers/actionsReducer";

export type NavigationData = {
  name: string;
  id: string;
  type: ENTITY_TYPE;
  url: string | undefined;
  navigable: boolean;
  children: Record<string, NavigationData>;
  peekable: boolean;
  peekData?: unknown;
  key?: string;
};
export type EntityNavigationData = Record<string, NavigationData>;

export const getEntitiesForNavigation = createSelector(
  getActionsForCurrentPage,
  getPlugins,
  getJSCollectionsForCurrentPage,
  getWidgets,
  getCurrentPageId,
  getDataTree,
  (actions, plugins, jsActions, widgets, pageId, dataTree: DataTree) => {
    const navigationData: EntityNavigationData = {};

    actions.forEach((action) => {
      const plugin = plugins.find(
        (plugin) => plugin.id === action.config.pluginId,
      );
      const config = getActionConfig(action.config.pluginType);
      const { childNavData, peekData } = getActionChildren(
        action,
        entityDefinitions.ACTION(
          dataTree[action.config.name] as DataTreeAction,
          {},
        ),
        dataTree[action.config.name] as DataTreeAction,
      );
      if (!config) return;
      navigationData[action.config.name] = {
        name: action.config.name,
        id: action.config.id,
        type: ENTITY_TYPE.ACTION,
        url: config.getURL(
          pageId,
          action.config.id,
          action.config.pluginType,
          plugin,
        ),
        navigable: true,
        children: childNavData,
        peekable: true, // hide tooltip when set to false
        peekData,
      };
    });

    jsActions.forEach((jsAction) => {
      const { childNavData, peekData } = getJsObjectChildren(
        jsAction,
        pageId,
        dataTree[jsAction.config.name] as DataTreeJSAction,
      );
      navigationData[jsAction.config.name] = {
        name: jsAction.config.name,
        id: jsAction.config.id,
        type: ENTITY_TYPE.JSACTION,
        url: jsCollectionIdURL({ pageId, collectionId: jsAction.config.id }),
        navigable: true,
        children: childNavData,
        peekable: true,
        peekData,
      };
    });

    Object.values(widgets).forEach((widget) => {
      const { childNavData, peekData } = getWidgetChildren(
        widget,
        dataTree,
        pageId,
      );
      navigationData[widget.widgetName] = {
        name: widget.widgetName,
        id: widget.widgetId,
        type: ENTITY_TYPE.WIDGET,
        url: builderURL({ pageId, hash: widget.widgetId }),
        navigable: true,
        children: childNavData,
        peekable: true,
        peekData,
      };
    });
    return navigationData;
  },
);

const getJsObjectChildren = (
  jsAction: JSCollectionData,
  pageId: string,
  dataTree: DataTreeJSAction,
) => {
  const peekData: Record<string, unknown> = {};
  let childNavData: Record<string, NavigationData> = {};

  let children: NavigationData[] = jsAction.config.actions.map((jsChild) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    peekData[jsChild.name] = function() {};
    return {
      name: `${jsAction.config.name}.${jsChild.name}`,
      key: jsChild.name,
      id: `${jsAction.config.name}.${jsChild.name}`,
      type: ENTITY_TYPE.JSACTION,
      url: jsCollectionIdURL({
        pageId,
        collectionId: jsAction.config.id,
        functionName: jsChild.name,
      }),
      navigable: true,
      children: {},
      peekable: true,
    };
  });

  const variableChildren: NavigationData[] = jsAction.config.variables.map(
    (jsChild) => {
      peekData[jsChild.name] = dataTree[jsChild.name];
      return {
        name: `${jsAction.config.name}.${jsChild.name}`,
        key: jsChild.name,
        id: `${jsAction.config.name}.${jsChild.name}`,
        type: ENTITY_TYPE.JSACTION,
        url: jsCollectionIdURL({
          pageId,
          collectionId: jsAction.config.id,
          functionName: jsChild.name,
        }),
        navigable: true,
        children: {},
        peekable: true,
      };
    },
  );

  children = children.concat(variableChildren);

  childNavData = keyBy(children, (data) => data.key) as Record<
    string,
    NavigationData
  >;

  return { childNavData, peekData };
};

const getWidgetChildren = (
  widget: FlattenedWidgetProps,
  dataTree: DataTree,
  pageId: string,
) => {
  const peekData: Record<string, unknown> = {};
  const childNavData: Record<string, NavigationData> = {};
  const dataTreeWidget: DataTreeWidget = dataTree[
    widget.widgetName
  ] as DataTreeWidget;
  if (widget.type === "FORM_WIDGET") {
    const children: EntityNavigationData = {};
    const formChildren: EntityNavigationData = {};
    if (dataTreeWidget) {
      Object.keys(dataTreeWidget.data || {}).forEach((widgetName) => {
        const childWidgetId = (dataTree[widgetName] as DataTreeWidget).widgetId;
        formChildren[widgetName] = {
          name: widgetName,
          id: `${widget.widgetName}.data.${widgetName}`,
          type: ENTITY_TYPE.WIDGET,
          navigable: true,
          children: {},
          url: builderURL({ pageId, hash: childWidgetId }),
          peekable: false,
        };
      });
    }
    children.data = {
      name: "data",
      id: `${widget.widgetName}.data`,
      type: ENTITY_TYPE.WIDGET,
      navigable: false,
      children: formChildren,
      url: undefined,
      peekable: false,
    };

    return { childNavData: children, peekData };
  }
  const type: Exclude<
    EntityDefinitionsOptions,
    "CANVAS_WIDGET" | "ICON_WIDGET" | "SKELETON_WIDGET" | "TABS_MIGRATOR_WIDGET"
  > = dataTreeWidget.type as any;
  let config: any = entityDefinitions[type];
  if (config) {
    if (isFunction(config)) config = config(dataTreeWidget);
    const widgetProps = Object.keys(config).filter(
      (k) => k.indexOf("!") === -1,
    );
    widgetProps.forEach((prop) => {
      const data = dataTreeWidget[prop];
      peekData[prop] = data;
      childNavData[prop] = {
        name: `${widget.widgetName}.${prop}`,
        id: `${widget.widgetName}.${prop}`,
        type: ENTITY_TYPE.WIDGET,
        navigable: false,
        children: {},
        url: undefined,
        peekable: true,
      };
    });
  }
  return { childNavData, peekData };
};

const getActionChildren = (
  action: ActionData,
  definitions: Record<string, unknown>,
  dataTree: DataTreeAction,
) => {
  const peekData: Record<string, unknown> = {};
  const childNavData: Record<string, NavigationData> = {};
  Object.keys(definitions).forEach((key) => {
    if (key.indexOf("!") === -1) {
      if (key === "data" || key === "isLoading" || key === "responseMeta") {
        peekData[key] = dataTree[key];
        childNavData[key] = {
          id: `${action.config.name}.${key}`,
          name: `${action.config.name}.${key}`,
          type: ENTITY_TYPE.ACTION,
          navigable: false,
          url: undefined,
          children: {},
          peekable: true,
        };
      } else if (key === "run" || key === "clear") {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        peekData[key] = function() {};
        childNavData[key] = {
          id: `${action.config.name}.${key}`,
          name: `${action.config.name}.${key}`,
          type: ENTITY_TYPE.ACTION,
          navigable: false,
          url: undefined,
          children: {},
          peekable: true,
        };
      }
    }
  });

  return { peekData, childNavData };
};
