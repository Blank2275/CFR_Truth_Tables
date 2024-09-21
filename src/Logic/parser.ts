interface Token {
    type: string
    value: string
}

export interface LexicalSettings {
    And: string
    Or: string
    Not: string
    Conditional: string
    Biconditional: string
}

export function lex(expression: string, settings: LexicalSettings): Token[] {
    let current = 0
    let tokens: Token[] = [];

    while(!isAtEnd()) {
        let done = false
        for (let key of Object.keys(settings)) {
            //@ts-ignore
            if (matchString(settings[key])) {
                tokens.push({
                    type: key,
                    value: "",
                });
                done = true
            }
        }

        if (done) continue // we have already matched,
        // continuing could cause error at end of input

       if (peek() == " " || peek() == "\t") {
           continue
       } else if (peek() == "(") {
            tokens.push({
                type: "(",
                value: "",
            });
        } else if (peek() == ")") {
            tokens.push({
                type: ")",
                value: "",
            });
        } else if (isValidVarname(peek())) {
            tokens.push({
                type: "Var",
                value: peek(),
            })
        } else if (isInvalidVarname(peek())) {
            throw new Error(`Invalid Variable ${peek()}`)
        } else {
            throw new Error(`Unexpected Char ${peek()}`)
        }

        current += 1
    }

    function isValidVarname(str: string) {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").indexOf(str) != -1;
    }

    function isInvalidVarname(str: string) {
        return "abcdefghijklmnopqrstuvwxyz".split("").indexOf(str) != -1;
    }

    function matchString(str: string): boolean {
        let val = ""

        for(let offset = 0; offset < str.length; offset++) {
            val += expression.charAt(current + offset)
        }
        if (val == str){
            current += str.length
            return true
        }

        return false
    }

    function isAtEnd(): boolean {
        return current >= expression.length;
    }

    function peek() {
        return expression.charAt(current);
    }

    return tokens
}

export interface ParserSettings {
    implicitAnd: boolean,
    prefixNot: boolean // prefix or postfix
    explicitParentheses: boolean
}

export interface AstNode {
    type: string
}

export interface OperatorNode extends AstNode{
    type: string
    operator: string
}

export interface BinaryNode extends OperatorNode {
    type: "Binary"
    operator: string
    left: AstNode
    right: AstNode
}

export interface NotNode extends AstNode {
    type: "Not"
    value: AstNode
}

//@ts-ignore
export interface VarNode extends AstNode {
    type: "Var"
    name: string
}

export interface GroupingNode extends AstNode {
    type: "Grouping"
    value: AstNode
}

export function parse(tokens: Token[], settings: ParserSettings): AstNode {
    let current = 0;

    let ast =  biconditional();

    if (!isAtEnd()) {
        throw new Error(`Expected End of Expression`)
    }

    if (settings.explicitParentheses) {
        let valid = verifyParentheses(ast)

        if (!valid) throw new Error("Ambiguous Situation, Parentheses Required")
    }

    return ast

    function verifyParentheses(node: AstNode): boolean {
        if (node.type == "Grouping") {
            return verifyParentheses((node as GroupingNode).value)
        } else if (node.type == "Binary") {
            let bNode = node as BinaryNode
            let validChildren: boolean = verifyParentheses(bNode.left) && verifyParentheses(bNode.right)
            let validOperands: boolean = isValidOperand(bNode.left) && isValidOperand(bNode.right)

            return validOperands && validChildren
        } else if (node.type == "Not") {
            let child = (node as NotNode).value
            return isValidOperand(child) && verifyParentheses(child)
        } else if (node.type == "Var") {
            return true
        } else {
            throw new Error("Invalid AST Node")
        }

        function isValidOperand(node: AstNode) {
            return node.type != "Binary"
        }
    }

    function biconditional(): AstNode {
        let expr: AstNode = conditional();

        while (match("Biconditional")) {
            let right = conditional()

            expr = {
                "type": "Binary",
                //@ts-ignore
                "operator": "Biconditional",
                "left": expr,
                "right": right
            }
        }

        return expr
    }

    function conditional(): AstNode {
        let expr: AstNode = or();

        while (match("Conditional")) {
            let right = or()

            expr = {
                "type": "Binary",
                //@ts-ignore
                "operator": "Conditional",
                "left": expr,
                "right": right
            }
        }

        return expr
    }

    function or(): AstNode {
        let expr: AstNode = and();

        while (match("Or")) {
            let right = and()

            expr = {
                "type": "Binary",
                //@ts-ignore
                "operator": "Or",
                "left": expr,
                "right": right
            }
        }

        return expr
    }

    function and(): AstNode {
        let expr: AstNode = not();

        if (settings.implicitAnd) {
            while (["And", "Not", "(", "Var"].includes(peek().type)) {
                let right = not()

                expr = {
                    "type": "Binary",
                    //@ts-ignore
                    "operator": "And",
                    "left": expr,
                    "right": right
                }
            }
        } else {
            while (match("And")) {
                let right = not()

                expr = {
                    "type": "Binary",
                    //@ts-ignore
                    operator: "And",
                    left: expr,
                    right: right
                }
            }
        }


        return expr
    }

    function not(): AstNode {
        if (settings.prefixNot) {
            if (match("Not")) {
                return {
                    "type": "Not",
                    //@ts-ignore
                    "value": value()
                }
            }

            return value()
        } else { // postfix
            let node = value();
            if (match("Not")) {
                node = {
                    "type": "Not",
                    //@ts-ignore
                    "value": node
                }
            }

            return node
        }
    }

    function value(): AstNode {
        if (match("Var")) {
            return {
                "type": "Var",
                //@ts-ignore
                "name": previous().value
            }
        } else if (match("(")) {
            let val = {
                "type": "Grouping",
                "value": biconditional()
            }

            expect(")", "Expected Closing Parentheses")

            return val
        } else {
            throw new Error("Invalid Syntax");
        }
    }

    function match(...types: string[]): boolean {
        if (isAtEnd()) return false
        if (types.indexOf(peek().type) != -1) {
            advance();
            return true
        }

        return false
    }

    function peek(): Token {
        let fallack: Token = {
            "type": "EOI",
            "value": ""
        }
        return tokens[current] ?? fallack;
    }

    function advance(): Token {
        if (isAtEnd()) throw new Error("Unexpected End of Input")
        return tokens[current++];
    }

    function isAtEnd(): boolean {
        return current >= tokens.length;
    }

    function previous() {
        if (current === 0) throw new Error("Previous called on first token")
        return tokens[current - 1];
    }

    function expect(type: string, message: string) {
        if (advance().type != type) {
            throw new Error(message);
        }
    }


}