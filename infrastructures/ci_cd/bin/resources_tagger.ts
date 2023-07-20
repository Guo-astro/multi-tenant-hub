import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";

interface Tag {
  key: string;
  value: string;
}

export class ResourcesTagger implements IAspect {
  private tags: Tag[];

  constructor(tags: Tag[]) {
    this.tags = tags;
  }

  visit(node: IConstruct): void {
    for (const tag of this.tags) {
      Tags.of(node).add(tag.key, tag.value);
    }
  }
}
