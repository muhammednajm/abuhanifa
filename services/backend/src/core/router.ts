const routes: { [name: string]: any[] } = {};

function get(pathname: string) {
  return (target: any, name: string, descriptor: PropertyDescriptor) => {
    if (!("GET" in routes)) {
      routes["GET"] = [];
    }

    const basePath = "/" + target.constructor.name.toLowerCase();

    const joined = (basePath + (pathname === "/" ? "" : pathname));

    routes["GET"].push([joined, target, target[name]]);
  };
}

export { get, routes as default };
