/**
 *  Copyright (c) 2021 GraphQL Contributors
 *  All rights reserved.
 *
 *  This source code is licensed under the license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { Hover } from 'vscode-languageserver-types';

import fs from 'node:fs';
import { buildSchema, GraphQLSchema } from 'graphql';
import { Position } from 'graphql-language-service';
import path from 'node:path';

import { getHoverInformation } from '../getHoverInformation';

describe('getHoverInformation', () => {
  let schema: GraphQLSchema;
  beforeEach(async () => {
    const schemaIDL = fs.readFileSync(
      path.join(__dirname, '__schema__/HoverTestSchema.graphql'),
      'utf8',
    );

    schema = buildSchema(schemaIDL);
  });

  function testHover(query: string, point: Position): Hover['contents'] {
    return getHoverInformation(schema, query, point);
  }

  describe('provides leaf field information', () => {
    it('when in middle of token', () => {
      const actual = testHover(
        'query { thing { testField } }',
        new Position(0, 20),
      );
      expect(actual).toEqual(
        'TestType.testField: String\n\nThis is field documentation for TestType.testField',
      );
    });

    it('when at start of token', () => {
      const actual = testHover(
        'query { thing { testField } }',
        new Position(0, 16),
      );
      expect(actual).toEqual(
        'TestType.testField: String\n\nThis is field documentation for TestType.testField',
      );
    });
    it('when at end of token', () => {
      const actual = testHover(
        'query { thing { testField } }',
        new Position(0, 24),
      );
      expect(actual).toEqual(
        'TestType.testField: String\n\nThis is field documentation for TestType.testField',
      );
    });
  });

  it('provides aliased field information', () => {
    const actual = testHover(
      'query { thing { other: testField } }',
      new Position(0, 25),
    );
    expect(actual).toEqual(
      'TestType.testField: String\n\nThis is field documentation for TestType.testField',
    );
  });

  it('provides intermediate field information', () => {
    const actual = testHover(
      'query { thing { testField } }',
      new Position(0, 10),
    );
    expect(actual).toEqual(
      'Query.thing: TestType\n\nThis is field documentation for Query.thing',
    );
  });

  it('provides list field information', () => {
    const actual = testHover(
      'query { listOfThing { testField } }',
      new Position(0, 10),
    );
    expect(actual).toEqual('Query.listOfThing: [TestType!]');
  });

  it('provides deprecated field information', () => {
    const actual = testHover(
      'query { thing { testDeprecatedField } }',
      new Position(0, 20),
    );
    expect(actual).toEqual(
      'TestType.testDeprecatedField: Float\n\nDeprecated: deprecation reason',
    );
  });

  it('provides enum field information', () => {
    const actual = testHover(
      'query { thing { testEnumField } }',
      new Position(0, 20),
    );
    expect(actual).toEqual('TestType.testEnumField: Color');
  });

  it('provides scalar field information', () => {
    const actual = testHover('query { cluck }', new Position(0, 10));
    expect(actual).toEqual('Query.cluck: Chicken');
  });

  it('provides parameter type information', () => {
    const actual = testHover(
      'query { parameterizedField(id: "foo") { testField } }',
      new Position(0, 28),
    );
    expect(actual).toEqual('Query.parameterizedField(id: String!)');
  });

  it('provides enum parameter type information', () => {
    const actual = testHover(
      'query { parameterizedField(id: "foo", enum: GREEN) { testField } }',
      new Position(0, 46),
    );
    expect(actual).toEqual('Color.GREEN');
  });

  it('provides variable type information', () => {
    const actual = testHover(
      'query($who: String!) { parameterizedField(id: $who) { testField } }',
      new Position(0, 48),
    );
    expect(actual).toEqual('String!');
  });

  it('provides directive information', () => {
    const actual = testHover(
      'query { thing { testField @skip(if:true) } }',
      new Position(0, 30),
    );
    expect(actual).toEqual(
      '@skip\n\nDirects the executor to skip this field or fragment when the `if` argument is true.',
    );
  });

  it('provides union information', () => {
    const actual = testHover('query { unionField }', new Position(0, 12));
    expect(actual).toEqual('Query.unionField: UnionType');
  });
});
