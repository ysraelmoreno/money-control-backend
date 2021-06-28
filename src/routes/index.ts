import { Router } from "express";
import usersRouter from "./users/users.routes";

const routes = Router();

routes.use("/account", usersRouter);

export default routes;
