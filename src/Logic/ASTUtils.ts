import {AstNode, BinaryNode, GroupingNode, LexicalSettings, NotNode, ParserSettings, VarNode} from "./parser.ts";

export function ASTToString(node: AstNode, lSettings: LexicalSettings, pSettings: ParserSettings): string {
    if (node.type === "Grouping") {
        return `(${ASTToString((node as GroupingNode).value, lSettings, pSettings)})`
    } else if (node.type === "Binary") {
        let bNode = node as BinaryNode
        let left = ASTToString((bNode).left, lSettings, pSettings)
        let right = ASTToString((bNode).right, lSettings, pSettings)

        if (bNode.operator == "And" && pSettings.implicitAnd) {
            return `${left}${right}`
        }
        //@ts-ignore
        return `${left}${lSettings[bNode.operator]}${right}`
    } else if (node.type == "Not") {
        let value = ASTToString((node as NotNode).value, lSettings, pSettings)
        let op = lSettings["Not"]

        if (pSettings.prefixNot) {
            return `${op}${value}`
        }
        return `${value}${op}`
    } else if (node.type == "Var") {
        return (node as VarNode).name
    }
    return "";
}

export function evaluatePossibleWorld(node: AstNode, vars: {[key: string]: boolean}): boolean {
    if (node.type == "Grouping") {
        return evaluatePossibleWorld((node as GroupingNode).value, vars)
    } else if (node.type == "Binary") {
        let bNode = (node as BinaryNode);
        switch (bNode.operator) {
            case "And":
                return evaluatePossibleWorld(bNode.left, vars) && evaluatePossibleWorld(bNode.right, vars)
            case "Or":
                return evaluatePossibleWorld(bNode.left, vars) || evaluatePossibleWorld(bNode.right, vars)
            case "Conditional":
                return !evaluatePossibleWorld(bNode.left, vars) || evaluatePossibleWorld(bNode.right, vars)
            case "Biconditional":
                return evaluatePossibleWorld(bNode.left, vars) == evaluatePossibleWorld(bNode.right, vars)
        }
    } else if (node.type == "Not") {
        return !evaluatePossibleWorld((node as NotNode).value, vars)
    } else if (node.type == "Var") {
        let val = vars[(node as VarNode).name]

        if (val == undefined) throw new Error("Undefined Variable, this is a bug")

        return val
    }

    throw new Error("Invalid AST Node")
}

export function getAllPossibleWorlds(node: AstNode): {[key: string]: boolean}[] {
    let vars = getAllVariables(node);
    let worlds: {[key: string]: boolean}[] = []

    for (let i = 0; i < Math.pow(2, vars.length); i++) {
        let world: {[key: string]: boolean} = {};
        for (let j = 0; j < vars.length; j++) {
            let blockSize = Math.pow(2, vars.length - j - 1)
            let blockNum = Math.floor(i / blockSize)

            world[vars[j]] = blockNum % 2 == 0
        }

        worlds.push(world)
    }

    return worlds
}

export function getAllVariables(node: AstNode): string[] {
    let vars: string[] = [];

    let open = [node];

    while(open.length > 0) {
        let node: AstNode = open.shift()!
        if (node.type == "Var") addVar((node as VarNode).name)
        else if (node.type == "Grouping") {
            open.push((node as GroupingNode).value)
        } else if (node.type == "Not") {
            open.push((node as NotNode).value)
        } else if (node.type == "Binary")  {
            open.push((node as BinaryNode).left)
            open.push((node as BinaryNode).right)
        }
    }

    function addVar(name: string) {
        if (!vars.includes(name)) vars.push(name)
    }

    return vars
}

export function getSteps(node: AstNode): AstNode[] {
    let steps: AstNode[] = []

    if (node.type == "Grouping") {
        steps = [...getSteps((node as GroupingNode).value)]
    } else if (node.type == "Not") {
        steps = [...getSteps((node as NotNode).value)]
    } else if (node.type == "Binary")  {
        steps = [...getSteps((node as BinaryNode).left)]
        steps = [...steps, ...getSteps((node as BinaryNode).right)]
    }

    if(node.type != "Var" && node.type != "Grouping") {
        steps.push(node)
    }

    return steps
}