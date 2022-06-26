import * as Router from "../core/router.ts";

class Subject {

	@Router.get("/") async many(req: any, { rows }: any) {
		const body = await rows(`
			select
				id,
				name
			from subjects
		`)
		return [200, body];
	}

	@Router.get("/:id") async byId({ params: { id } }: any, { row }: any) {
		const body = await row(`
			select
				id,
				name
			from subjects where id = $id
		`, { id })
		return [200, body];
	}
}
