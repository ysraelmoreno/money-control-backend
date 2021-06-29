import { Router, Request, Response, NextFunction, request } from "express";
import { v4 } from "uuid";

const usersRouter = Router();

interface StatementUser {
  id: string;
  type: "credit" | "debit";
  amount: number;
  date: string;
}

interface UsersDTO {
  id: string;
  name: string;
  email: string;
  password: string;
  cpf: string;
  statement: StatementUser[];
  createdAt: string;
  updatedAt: string;
}

const users: UsersDTO[] = [];

function getBalance(statement: StatementUser[]) {
  return statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
}

function verifyExistsAccountCPF(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { cpf } = request.headers;
  const accountCPFExists = users.find((user) => user.cpf === cpf);

  if (!accountCPFExists) {
    return response.status(401).json({
      error: "Account not found",
    });
  }

  return next();
}

usersRouter.post("/create", (request, response) => {
  const { name, email, password, cpf } = request.body;

  const accountEmailExists = users.some((user) => user.email === email);
  const accountCPFExists = users.some((user) => user.cpf === cpf);

  if (accountEmailExists || accountCPFExists) {
    return response.status(400).json({
      error: "Account email or cpf already exists",
    });
  }

  const newUser = {
    id: v4(),
    cpf,
    name,
    email,
    statement: [],
    password,
    createdAt: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    updatedAt: new Intl.DateTimeFormat("pt-BR").format(new Date()),
  };

  users.push(newUser);

  return response.json(newUser);
});

usersRouter.get("/", (request, response) => {
  return response.json(users);
});

usersRouter.get("/statement", verifyExistsAccountCPF, (request, response) => {
  const { cpf } = request.headers;

  const findUser = users.find((user) => user.cpf === cpf);

  if (!findUser) {
    return response.status(401).json({
      error: "Account not found",
    });
  }

  const total = getBalance(findUser.statement);

  return response.json({ statement: findUser.statement, total });
});

usersRouter.post("/statement", verifyExistsAccountCPF, (request, response) => {
  const { cpf } = request.headers;
  const { date } = request.body;
  const findUser = users.find((user) => user.cpf === cpf);

  if (!findUser) {
    return response.status(401).json({
      error: "Account not found",
    });
  }

  const statements = findUser.statement.filter((stmt) => stmt.date === date);

  const total = getBalance(findUser.statement);

  return response.json({ statements, total });
});

usersRouter.post(
  "/statement/deposit",
  verifyExistsAccountCPF,
  (request, response) => {
    const { cpf } = request.headers;
    const { type, amount } = request.body;

    const findUser = users.find((user) => user.cpf === cpf);

    if (!findUser) {
      return response.status(400).json({ error: "Account not found" });
    }
    const newStatement = {
      id: v4(),
      type,
      amount,
      date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    };

    findUser.statement.push(newStatement);

    return response.json(newStatement);
  }
);

usersRouter.post(
  "/statement/withdraw",
  verifyExistsAccountCPF,
  (request, response) => {
    const { cpf } = request.headers;
    const { type, amount } = request.body;

    const findUser = users.find((user) => user.cpf === cpf);

    if (!findUser) {
      return response.status(400).json({ error: "Account not found" });
    }

    const balance = getBalance(findUser.statement);

    if (balance < amount) {
      return response
        .status(400)
        .json({ error: "You don't have enough balance" });
    }

    const newStatement = {
      id: v4(),
      type,
      amount,
      date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    };

    findUser.statement.push(newStatement);

    const newBalance = getBalance(findUser.statement);

    return response.json({
      newStatement,
      total: newBalance,
    });
  }
);

usersRouter.delete("/statement/delete/:id", (request, response) => {
  const { cpf } = request.headers;
  const { id } = request.params;

  const findUser = users.find((user) => user.cpf === cpf);

  if (!findUser) {
    return response.status(400).json({ error: "Account not found" });
  }

  const findStatement = findUser.statement.findIndex(
    (statement) => statement.id === id
  );

  findUser.statement.splice(findStatement, 1);

  return response.status(200).json();
});

export default usersRouter;
